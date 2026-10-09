import nodemailer from 'nodemailer'
import tls from 'node:tls'
import type { Owner } from '@/types/domain'

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

function env(owner: Owner, key: string) {
  return (
    process.env[`MAIL_${owner.toUpperCase()}_${key}`] ||
    process.env[`MAIL_${key}`] ||
    ''
  )
}

function bool(value: string, fallback: boolean) {
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function accountFor(owner: Owner): MailAccount {
  const fromEmail = env(owner, 'FROM_EMAIL')
  const smtpHost = env(owner, 'SMTP_HOST')
  const smtpPassword = env(owner, 'SMTP_PASSWORD')
  const imapHost = env(owner, 'IMAP_HOST')
  const imapPassword = env(owner, 'IMAP_PASSWORD') || smtpPassword

  if (!fromEmail || !smtpHost || !smtpPassword) {
    throw new Error(
      `Messagerie ${owner} non configurée : FROM_EMAIL, SMTP_HOST et SMTP_PASSWORD sont requis.`
    )
  }

  if (!imapHost || !imapPassword) {
    throw new Error(
      `Messagerie ${owner} non configurée : IMAP_HOST et IMAP_PASSWORD sont requis pour enregistrer le message dans Envoyés.`
    )
  }

  return {
    fromName: env(owner, 'FROM_NAME') || `${owner} — KLS3`,
    fromEmail,
    smtpHost,
    smtpPort: Number(env(owner, 'SMTP_PORT') || '465'),
    smtpSecure: bool(env(owner, 'SMTP_SECURE'), true),
    smtpUser: env(owner, 'SMTP_USER') || fromEmail,
    smtpPassword,
    imapHost,
    imapPort: Number(env(owner, 'IMAP_PORT') || '993'),
    imapSecure: bool(env(owner, 'IMAP_SECURE'), true),
    imapUser: env(owner, 'IMAP_USER') || fromEmail,
    imapPassword,
    sentMailbox: env(owner, 'IMAP_SENT_MAILBOX'),
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

async function buildRawMessage(
  account: MailAccount,
  input: DirectMailSendInput,
  messageId: string
): Promise<Buffer> {
  const builder = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'windows',
  })

  const result = await builder.sendMail({
    from: { name: account.fromName, address: account.fromEmail },
    to: input.toEmail,
    subject: input.subject,
    messageId,
    text: `${input.text.trim()}\n\n${signatureText(input.owner, input.cardUrl)}`,
    html: `${input.html}${signatureHtml(input.owner, input.cardUrl)}`,
    attachments: input.attachments.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType || 'application/octet-stream',
      content: attachment.content,
    })),
  })

  if (!Buffer.isBuffer(result.message)) {
    throw new Error('Impossible de construire le message MIME.')
  }

  return result.message
}

async function appendToSent(account: MailAccount, raw: Buffer) {
  if (!account.imapSecure) {
    throw new Error('IMAP doit être configuré en TLS implicite (port 993).')
  }

  const socket = tls.connect({
    host: account.imapHost,
    port: account.imapPort,
    servername: account.imapHost,
  })

  socket.setEncoding('utf8')

  let buffer = ''
  const queue: string[] = []
  let resolveLine: ((line: string) => void) | null = null

  socket.on('data', (chunk: string) => {
    buffer += chunk
    while (true) {
      const index = buffer.indexOf('\r\n')
      if (index < 0) break
      const line = buffer.slice(0, index)
      buffer = buffer.slice(index + 2)

      if (resolveLine) {
        const resolve = resolveLine
        resolveLine = null
        resolve(line)
      } else {
        queue.push(line)
      }
    }
  })

  const readLine = async (): Promise<string> => {
    if (queue.length) return queue.shift() as string

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolveLine = null
        reject(new Error('Délai IMAP dépassé.'))
      }, 15000)

      resolveLine = (line) => {
        clearTimeout(timeout)
        resolve(line)
      }
    })
  }

  const waitForTag = async (tag: string) => {
    while (true) {
      const line = await readLine()
      if (line.startsWith(`${tag} OK`)) return
      if (line.startsWith(`${tag} NO`) || line.startsWith(`${tag} BAD`)) {
        throw new Error(line)
      }
    }
  }

  const quote = (value: string) =>
    `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

  await new Promise<void>((resolve, reject) => {
    socket.once('secureConnect', () => resolve())
    socket.once('error', reject)
  })

  try {
    const greeting = await readLine()
    if (!greeting.startsWith('* OK')) throw new Error(greeting)

    socket.write(
      `A001 LOGIN ${quote(account.imapUser)} ${quote(account.imapPassword)}\r\n`
    )
    await waitForTag('A001')

    socket.write(
      `A002 APPEND ${quote(account.sentMailbox || 'Sent')} (\\Seen) {${raw.length}}\r\n`
    )

    const continuation = await readLine()
    if (!continuation.startsWith('+')) {
      throw new Error(continuation)
    }

    socket.write(raw)
    socket.write('\r\n')
    await waitForTag('A002')

    socket.write('A003 LOGOUT\r\n')
  } finally {
    socket.end()
  }
}

export async function sendDirectMail(input: DirectMailSendInput) {
  const account = accountFor(input.owner)
  const messageId = `<${crypto.randomUUID()}@kls3-dev.com>`
  const raw = await buildRawMessage(account, input, messageId)

  const smtp = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: {
      user: account.smtpUser,
      pass: account.smtpPassword,
    },
  })

  await smtp.sendMail({
    envelope: {
      from: account.fromEmail,
      to: [input.toEmail],
    },
    raw,
  })

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

export function directMailConfigured(owner: Owner) {
  try {
    accountFor(owner)
    return true
  } catch {
    return false
  }
}
