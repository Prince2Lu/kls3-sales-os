import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
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
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: {
      user: account.imapUser,
      pass: account.imapPassword,
    },
    logger: false,
  })

  await client.connect()

  try {
    let sentMailbox = account.sentMailbox
    if (!sentMailbox) {
      const mailboxes = await client.list()
      sentMailbox =
        mailboxes.find((mailbox) => mailbox.specialUse === '\\Sent')?.path ||
        'Sent'
    }

    await client.append(sentMailbox, raw, ['\\Seen'], new Date())
  } finally {
    await client.logout().catch(() => undefined)
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
