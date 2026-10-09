import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import type { Owner } from '@/types/domain'

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

export type DirectMailSendInput = {
  owner: Owner
  toEmail: string
  subject: string
  body: string
  cardUrl: string
}

function ownerEnv(owner: Owner, key: string) {
  return process.env[`MAIL_${owner.toUpperCase()}_${key}`] || process.env[`MAIL_${key}`] || ''
}

function parseBoolean(value: string, fallback: boolean) {
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function getAccount(owner: Owner): MailAccount {
  const fromEmail = ownerEnv(owner, 'FROM_EMAIL')
  const smtpHost = ownerEnv(owner, 'SMTP_HOST')
  const smtpPassword = ownerEnv(owner, 'SMTP_PASSWORD')
  const imapHost = ownerEnv(owner, 'IMAP_HOST')
  const imapPassword = ownerEnv(owner, 'IMAP_PASSWORD') || smtpPassword

  if (!fromEmail || !smtpHost || !smtpPassword) {
    throw new Error(`Messagerie ${owner} non configurée pour l’envoi SMTP.`)
  }
  if (!imapHost || !imapPassword) {
    throw new Error(`Messagerie ${owner} non configurée pour l’archivage IMAP.`)
  }

  return {
    fromName: ownerEnv(owner, 'FROM_NAME') || `${owner} — KLS3`,
    fromEmail,
    smtpHost,
    smtpPort: Number(ownerEnv(owner, 'SMTP_PORT') || '465'),
    smtpSecure: parseBoolean(ownerEnv(owner, 'SMTP_SECURE'), true),
    smtpUser: ownerEnv(owner, 'SMTP_USER') || fromEmail,
    smtpPassword,
    imapHost,
    imapPort: Number(ownerEnv(owner, 'IMAP_PORT') || '993'),
    imapSecure: parseBoolean(ownerEnv(owner, 'IMAP_SECURE'), true),
    imapUser: ownerEnv(owner, 'IMAP_USER') || fromEmail,
    imapPassword,
    sentMailbox: ownerEnv(owner, 'IMAP_SENT_MAILBOX'),
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char))
}

function displayIdentity(owner: Owner) {
  return owner === 'Eric'
    ? { name: 'Eric Scarpino', title: 'Directeur de missions' }
    : { name: 'Lilian Scarpino', title: 'Directeur commercial' }
}

async function appendToSent(account: MailAccount, raw: Buffer) {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: { user: account.imapUser, pass: account.imapPassword },
    logger: false,
  })

  await client.connect()
  try {
    let mailbox = account.sentMailbox
    if (!mailbox) {
      const mailboxes = await client.list()
      mailbox = mailboxes.find((item) => item.specialUse === '\\Sent')?.path || 'Sent'
    }
    await client.append(mailbox, raw, ['\\Seen'], new Date())
  } finally {
    await client.logout().catch(() => undefined)
  }
}

export async function sendDirectMail(input: DirectMailSendInput) {
  const account = getAccount(input.owner)
  const identity = displayIdentity(input.owner)
  const messageId = `<${crypto.randomUUID()}@kls3-dev.com>`

  const text = [
    input.body.trim(),
    '',
    'Cordialement,',
    identity.name,
    `${identity.title} — KLS3`,
    `Ma carte digitale : ${input.cardUrl}`,
  ].join('\n')

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111">${escapeHtml(input.body.trim()).replace(/\n/g, '<br>')}<br><br>Cordialement,<br><strong>${identity.name}</strong><br>${identity.title} — KLS3<br><a href="${escapeHtml(input.cardUrl)}">Ma carte digitale</a></div>`

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: { user: account.smtpUser, pass: account.smtpPassword },
  })

  const info = await transporter.sendMail({
    from: { name: account.fromName, address: account.fromEmail },
    to: input.toEmail,
    subject: input.subject,
    text,
    html,
    messageId,
  })

  const raw = await nodemailer.createTestAccount
    ? Buffer.from([
        `Message-ID: ${messageId}`,
        `Date: ${new Date().toUTCString()}`,
        `From: ${account.fromName} <${account.fromEmail}>`,
        `To: <${input.toEmail}>`,
        `Subject: ${input.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        text,
      ].join('\r\n'), 'utf8')
    : Buffer.from(text, 'utf8')

  await appendToSent(account, raw)

  return { messageId: info.messageId || messageId, fromEmail: account.fromEmail }
}

export function directMailConfigured(owner: Owner) {
  try {
    getAccount(owner)
    return true
  } catch {
    return false
  }
}
