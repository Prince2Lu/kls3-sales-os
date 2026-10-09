import * as net from 'node:net'
import * as tls from 'node:tls'
import type { Owner } from '@/types/domain'
import { getMailSettings } from '@/lib/mail-settings'

export type DirectMailAttachment = {
  filename: string
  contentType: string
  content: Buffer
}

export type DirectMailSendInput = {
  owner: Owner
  toEmail: string
  subject: string
  html: string
  text: string
  cardUrl: string
  attachments: DirectMailAttachment[]
}

type MailAccount = {
  fromName: string
  fromEmail: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  imapUser: string
  imapPassword: string
  sentMailbox: string
}

type AnySocket = net.Socket | tls.TLSSocket

async function accountFor(owner: Owner): Promise<MailAccount> {
  const settings = await getMailSettings(owner)

  if (!settings.fromEmail || !settings.smtpHost || !settings.smtpPassword) {
    throw new Error(
      `Messagerie ${owner} non configurée : adresse d’envoi, serveur SMTP et mot de passe requis.`
    )
  }

  if (!settings.imapHost || !settings.imapPassword) {
    throw new Error(
      `Messagerie ${owner} non configurée : serveur IMAP et mot de passe requis pour enregistrer le message dans Envoyés.`
    )
  }

  return {
    fromName: settings.fromName || `${owner} — KLS3`,
    fromEmail: settings.fromEmail,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort || 465,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser || settings.fromEmail,
    smtpPassword: settings.smtpPassword,
    imapHost: settings.imapHost,
    imapPort: settings.imapPort || 993,
    imapSecure: settings.imapSecure,
    imapUser: settings.imapUser || settings.fromEmail,
    imapPassword: settings.imapPassword,
    sentMailbox: settings.sentMailbox || 'Sent',
  }
}

function identity(owner: Owner) {
  return owner === 'Eric'
    ? { name: 'Eric Scarpino', title: 'Directeur de missions' }
    : { name: 'Lilian Scarpino', title: 'Directeur commercial' }
}

function signatureHtml(owner: Owner, cardUrl: string) {
  const sender = identity(owner)
  return [
    '<div style="margin-top:24px;font-family:Arial,sans-serif;line-height:1.45;color:#111">',
    `<div><strong>${sender.name}</strong></div>`,
    `<div>${sender.title} - KLS3</div>`,
    '<div style="margin-top:10px">',
    `<a href="${cardUrl}" style="color:#4B7BF5;text-decoration:none">Ma carte de contact digitale →</a>`,
    '</div>',
    '</div>',
  ].join('')
}

function signatureText(owner: Owner, cardUrl: string) {
  const sender = identity(owner)
  return [
    sender.name,
    `${sender.title} - KLS3`,
    '',
    `Ma carte de contact digitale → ${cardUrl}`,
  ].join('\n')
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function wrapBase64(buffer: Buffer) {
  const encoded = buffer.toString('base64')
  return encoded.match(/.{1,76}/g)?.join('\r\n') || ''
}

function safeHeaderValue(value: string) {
  return value.replace(/[\r\n"]/g, '').slice(0, 180)
}

function buildRawMessage(
  account: MailAccount,
  input: DirectMailSendInput,
  messageId: string
) {
  const outer = `kls3-mixed-${crypto.randomUUID()}`
  const alternative = `kls3-alt-${crypto.randomUUID()}`
  const text = `${input.text.trim()}\n\n${signatureText(input.owner, input.cardUrl)}`
  const html = `${input.html}${signatureHtml(input.owner, input.cardUrl)}`

  const lines = [
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `From: ${encodeHeader(account.fromName)} <${account.fromEmail}>`,
    `To: <${input.toEmail}>`,
    `Subject: ${encodeHeader(input.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${outer}"`,
    '',
    `--${outer}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    '',
    `--${alternative}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(text, 'utf8')),
    `--${alternative}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(html, 'utf8')),
    `--${alternative}--`,
  ]

  for (const attachment of input.attachments) {
    const filename = safeHeaderValue(attachment.filename)
    lines.push(
      `--${outer}`,
      `Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      wrapBase64(attachment.content)
    )
  }

  lines.push(`--${outer}--`, '')

  return Buffer.from(lines.join('\r\n'), 'utf8')
}

function createLineReader(socket: AnySocket) {
  let buffer = ''
  const queue: string[] = []
  let pending:
    | { resolve: (line: string) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }
    | null = null

  socket.setEncoding('utf8')

  socket.on('data', (chunk) => {
    buffer += String(chunk)

    while (true) {
      const index = buffer.indexOf('\r\n')
      if (index < 0) break

      const line = buffer.slice(0, index)
      buffer = buffer.slice(index + 2)

      if (pending) {
        const current = pending
        pending = null
        clearTimeout(current.timer)
        current.resolve(line)
      } else {
        queue.push(line)
      }
    }
  })

  socket.on('error', (error) => {
    if (pending) {
      const current = pending
      pending = null
      clearTimeout(current.timer)
      current.reject(error)
    }
  })

  return async function readLine(timeoutMs = 15000): Promise<string> {
    if (queue.length) return queue.shift() as string

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending = null
        reject(new Error('Délai serveur mail dépassé.'))
      }, timeoutMs)

      pending = { resolve, reject, timer }
    })
  }
}

function writeLine(socket: AnySocket, value: string) {
  socket.write(`${value}\r\n`)
}

async function waitForSmtpResponse(
  readLine: () => Promise<string>,
  expectedCodes: number[]
) {
  const first = await readLine()
  const code = Number(first.slice(0, 3))

  if (first[3] === '-') {
    while (true) {
      const line = await readLine()
      if (line.startsWith(`${code} `)) break
    }
  }

  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP ${code}: ${first}`)
  }
}

async function connectPlain(host: string, port: number) {
  const socket = net.connect({ host, port })

  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('error', reject)
  })

  return socket
}

async function connectTls(host: string, port: number) {
  const socket = tls.connect({
    host,
    port,
    servername: host,
  })

  await new Promise<void>((resolve, reject) => {
    socket.once('secureConnect', resolve)
    socket.once('error', reject)
  })

  return socket
}

async function sendSmtp(account: MailAccount, toEmail: string, raw: Buffer) {
  let socket: AnySocket
  let readLine: () => Promise<string>

  if (account.smtpSecure) {
    socket = await connectTls(account.smtpHost, account.smtpPort)
    readLine = createLineReader(socket)
    await waitForSmtpResponse(readLine, [220])
  } else {
    const plain = await connectPlain(account.smtpHost, account.smtpPort)
    const plainReader = createLineReader(plain)

    await waitForSmtpResponse(plainReader, [220])
    writeLine(plain, 'EHLO kls3-dev.com')
    await waitForSmtpResponse(plainReader, [250])
    writeLine(plain, 'STARTTLS')
    await waitForSmtpResponse(plainReader, [220])

    socket = tls.connect({
      socket: plain,
      servername: account.smtpHost,
    })

    await new Promise<void>((resolve, reject) => {
      ;(socket as tls.TLSSocket).once('secureConnect', resolve)
      socket.once('error', reject)
    })

    readLine = createLineReader(socket)
  }

  try {
    writeLine(socket, 'EHLO kls3-dev.com')
    await waitForSmtpResponse(readLine, [250])

    writeLine(socket, 'AUTH LOGIN')
    await waitForSmtpResponse(readLine, [334])
    writeLine(socket, Buffer.from(account.smtpUser, 'utf8').toString('base64'))
    await waitForSmtpResponse(readLine, [334])
    writeLine(socket, Buffer.from(account.smtpPassword, 'utf8').toString('base64'))
    await waitForSmtpResponse(readLine, [235])

    writeLine(socket, `MAIL FROM:<${account.fromEmail}>`)
    await waitForSmtpResponse(readLine, [250])
    writeLine(socket, `RCPT TO:<${toEmail}>`)
    await waitForSmtpResponse(readLine, [250, 251])

    writeLine(socket, 'DATA')
    await waitForSmtpResponse(readLine, [354])

    const message = raw
      .toString('utf8')
      .replace(/^\./gm, '..')
      .replace(/\r?\n/g, '\r\n')

    socket.write(message.endsWith('\r\n') ? message : `${message}\r\n`)
    socket.write('.\r\n')

    await waitForSmtpResponse(readLine, [250])
    writeLine(socket, 'QUIT')
  } finally {
    socket.end()
  }
}

function imapQuote(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

async function appendToSent(account: MailAccount, raw: Buffer) {
  if (!account.imapSecure) {
    throw new Error('IMAP doit être configuré en TLS implicite.')
  }

  const socket = await connectTls(account.imapHost, account.imapPort)
  const readLine = createLineReader(socket)

  const waitForTag = async (tag: string) => {
    while (true) {
      const line = await readLine()
      if (line.startsWith(`${tag} OK`)) return
      if (line.startsWith(`${tag} NO`) || line.startsWith(`${tag} BAD`)) {
        throw new Error(`IMAP: ${line}`)
      }
    }
  }

  try {
    const greeting = await readLine()
    if (!greeting.startsWith('* OK')) {
      throw new Error(`IMAP: ${greeting}`)
    }

    writeLine(
      socket,
      `A001 LOGIN ${imapQuote(account.imapUser)} ${imapQuote(account.imapPassword)}`
    )
    await waitForTag('A001')

    socket.write(
      `A002 APPEND ${imapQuote(account.sentMailbox)} (\\Seen) {${raw.length}}\r\n`
    )

    const continuation = await readLine()
    if (!continuation.startsWith('+')) {
      throw new Error(`IMAP APPEND: ${continuation}`)
    }

    socket.write(raw)
    socket.write('\r\n')
    await waitForTag('A002')

    writeLine(socket, 'A003 LOGOUT')
  } finally {
    socket.end()
  }
}

export async function sendDirectMail(input: DirectMailSendInput) {
  const account = await accountFor(input.owner)
  const messageId = `<${crypto.randomUUID()}@kls3-dev.com>`
  const raw = buildRawMessage(account, input, messageId)

  await sendSmtp(account, input.toEmail, raw)

  let imapArchived = true
  let archiveWarning = ''

  try {
    await appendToSent(account, raw)
  } catch (error) {
    imapArchived = false
    archiveWarning =
      error instanceof Error ? error.message : 'Archivage IMAP impossible'
  }

  return {
    messageId,
    fromEmail: account.fromEmail,
    imapArchived,
    archiveWarning,
  }
}

export async function directMailConfigured(owner: Owner) {
  try {
    await accountFor(owner)
    return true
  } catch {
    return false
  }
}
