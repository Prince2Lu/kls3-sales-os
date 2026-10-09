import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { getHeaders, getTableUrl, TABLE_NAMES } from '@/lib/airtable/config'
import type { Owner } from '@/types/domain'

export type MailSettings = {
  id: string | null
  owner: Owner
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
  updatedAt: string | null
}

type AirtableRecord = { id: string; fields: Record<string, unknown> }
type AirtableList = { records: AirtableRecord[] }

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function number(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function encryptionKey() {
  const source =
    process.env.MAIL_SETTINGS_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET

  if (!source) {
    throw new Error(
      'Aucune clé de chiffrement disponible. Configurez MAIL_SETTINGS_ENCRYPTION_KEY ou AUTH_SECRET.'
    )
  }

  return createHash('sha256').update(source).digest()
}

function encrypt(value: string) {
  if (!value) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

function decrypt(value: string) {
  if (!value) return ''

  const [version, ivB64, tagB64, encryptedB64] = value.split('.')
  if (version !== 'v1' || !ivB64 || !tagB64 || !encryptedB64) {
    throw new Error('Secret de messagerie invalide.')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivB64, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function mapRecord(record: AirtableRecord): MailSettings {
  const f = record.fields

  return {
    id: record.id,
    owner: text(f.Owner) as Owner,
    fromName: text(f['From Name']),
    fromEmail: text(f['From Email']),
    smtpHost: text(f['SMTP Host']),
    smtpPort: number(f['SMTP Port'], 465),
    smtpSecure: f['SMTP Secure'] === true,
    smtpUser: text(f['SMTP User']),
    smtpPassword: decrypt(text(f['SMTP Password Encrypted'])),
    imapHost: text(f['IMAP Host']),
    imapPort: number(f['IMAP Port'], 993),
    imapSecure: f['IMAP Secure'] === true,
    imapUser: text(f['IMAP User']),
    imapPassword: decrypt(text(f['IMAP Password Encrypted'])),
    sentMailbox: text(f['Sent Mailbox']) || 'Sent',
    updatedAt: text(f['Updated At']) || null,
  }
}

export function defaultMailSettings(owner: Owner): MailSettings {
  const fromEmail = owner === 'Eric' ? 'eric@kls3-dev.com' : 'lilian@kls3-dev.com'
  const fromName = owner === 'Eric' ? 'Eric Scarpino' : 'Lilian Scarpino'

  return {
    id: null,
    owner,
    fromName,
    fromEmail,
    smtpHost: 'mail.kls3-dev.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: fromEmail,
    smtpPassword: '',
    imapHost: 'mail.kls3-dev.com',
    imapPort: 993,
    imapSecure: true,
    imapUser: fromEmail,
    imapPassword: '',
    sentMailbox: 'Sent',
    updatedAt: null,
  }
}

export async function getMailSettings(owner: Owner): Promise<MailSettings> {
  const url = new URL(getTableUrl(TABLE_NAMES.MAIL_SETTINGS))
  url.searchParams.set('maxRecords', '1')
  url.searchParams.set('filterByFormula', `{Owner}="${owner}"`)

  const response = await fetch(url, {
    headers: getHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `Airtable mail settings error ${response.status}: ${await response.text()}`
    )
  }

  const data = (await response.json()) as AirtableList
  const record = data.records[0]

  return record ? mapRecord(record) : defaultMailSettings(owner)
}

export async function saveMailSettings(
  owner: Owner,
  input: Omit<MailSettings, 'id' | 'owner' | 'updatedAt'> & {
    smtpPassword?: string
    imapPassword?: string
  }
) {
  const existing = await getMailSettings(owner)
  const now = new Date().toISOString()

  const smtpPassword = input.smtpPassword || existing.smtpPassword
  const imapPassword = input.imapPassword || existing.imapPassword || smtpPassword

  const fields = {
    Name: `${owner} — ${input.fromEmail}`,
    Owner: owner,
    'From Name': input.fromName,
    'From Email': input.fromEmail,
    'SMTP Host': input.smtpHost,
    'SMTP Port': input.smtpPort,
    'SMTP Secure': input.smtpSecure,
    'SMTP User': input.smtpUser,
    'SMTP Password Encrypted': encrypt(smtpPassword),
    'IMAP Host': input.imapHost,
    'IMAP Port': input.imapPort,
    'IMAP Secure': input.imapSecure,
    'IMAP User': input.imapUser,
    'IMAP Password Encrypted': encrypt(imapPassword),
    'Sent Mailbox': input.sentMailbox || 'Sent',
    'Updated At': now,
  }

  const response = await fetch(
    existing.id
      ? `${getTableUrl(TABLE_NAMES.MAIL_SETTINGS)}/${encodeURIComponent(existing.id)}`
      : getTableUrl(TABLE_NAMES.MAIL_SETTINGS),
    {
      method: existing.id ? 'PATCH' : 'POST',
      headers: getHeaders(),
      body: JSON.stringify(
        existing.id
          ? { fields }
          : { records: [{ fields }] }
      ),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Airtable mail settings save failed ${response.status}: ${await response.text()}`
    )
  }

  return getMailSettings(owner)
}

export function publicMailSettings(settings: MailSettings) {
  return {
    owner: settings.owner,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpPasswordConfigured: Boolean(settings.smtpPassword),
    imapHost: settings.imapHost,
    imapPort: settings.imapPort,
    imapSecure: settings.imapSecure,
    imapUser: settings.imapUser,
    imapPasswordConfigured: Boolean(settings.imapPassword),
    sentMailbox: settings.sentMailbox,
    updatedAt: settings.updatedAt,
  }
}
