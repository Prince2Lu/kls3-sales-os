import { getHeaders, getTableUrl, TABLE_NAMES } from '@/lib/airtable/config'
import type { Owner } from '@/types/domain'

export type DirectEmailStatus = 'DRAFT' | 'SENT' | 'FAILED'

export type DirectEmailRecord = {
  id: string
  name: string
  contactId: string | null
  companyId: string | null
  owner: Owner
  toEmail: string
  subject: string
  body: string
  bodyHtml: string
  attachmentsJson: string
  cardRef: string
  cardUrl: string
  status: DirectEmailStatus
  messageId: string
  sentAt: string | null
  createdAt: string
}

type AirtableRecord = { id: string; fields: Record<string, unknown> }
type AirtableList = { records: AirtableRecord[]; offset?: string }

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function mapRecord(record: AirtableRecord): DirectEmailRecord {
  const f = record.fields
  return {
    id: record.id,
    name: text(f.Name),
    contactId: Array.isArray(f.Contact) ? String(f.Contact[0] || '') || null : null,
    companyId: Array.isArray(f.Company) ? String(f.Company[0] || '') || null : null,
    owner: text(f.Owner) as Owner,
    toEmail: text(f['To Email']),
    subject: text(f.Subject),
    body: text(f.Body),
    bodyHtml: text(f['Body HTML']),
    attachmentsJson: text(f['Attachments JSON']),
    cardRef: text(f['Card Ref']),
    cardUrl: text(f['Card URL']),
    status: text(f.Status) as DirectEmailStatus,
    messageId: text(f['Message ID']),
    sentAt: text(f['Sent At']) || null,
    createdAt: text(f['Created At']),
  }
}

export async function createDirectEmail(input: {
  contactId?: string
  companyId?: string
  owner: Owner
  toEmail: string
  subject: string
  body: string
  bodyHtml: string
  attachmentsJson?: string
  cardRef: string
  cardUrl: string
}) {
  const now = new Date().toISOString()
  const response = await fetch(getTableUrl(TABLE_NAMES.DIRECT_EMAILS), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      records: [{
        fields: {
          Name: `${input.toEmail} — ${input.subject}`.slice(0, 240),
          Contact: input.contactId ? [input.contactId] : undefined,
          Company: input.companyId ? [input.companyId] : undefined,
          Owner: input.owner,
          'To Email': input.toEmail,
          Subject: input.subject,
          Body: input.body,
          'Body HTML': input.bodyHtml,
          'Attachments JSON': input.attachmentsJson || '',
          'Card Ref': input.cardRef,
          'Card URL': input.cardUrl,
          Status: 'DRAFT',
          'Created At': now,
        },
      }],
    }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Airtable direct email create failed ${response.status}: ${await response.text()}`)
  const json = await response.json() as { records: AirtableRecord[] }
  return mapRecord(json.records[0])
}

export async function updateDirectEmail(id: string, input: {
  status?: DirectEmailStatus
  messageId?: string
  sentAt?: string
}) {
  const fields: Record<string, unknown> = {}
  if (input.status !== undefined) fields.Status = input.status
  if (input.messageId !== undefined) fields['Message ID'] = input.messageId
  if (input.sentAt !== undefined) fields['Sent At'] = input.sentAt

  const response = await fetch(`${getTableUrl(TABLE_NAMES.DIRECT_EMAILS)}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Airtable direct email update failed ${response.status}: ${await response.text()}`)
  return mapRecord(await response.json() as AirtableRecord)
}

export async function listDirectEmails(): Promise<DirectEmailRecord[]> {
  const all: DirectEmailRecord[] = []
  let offset = ''
  do {
    const url = new URL(getTableUrl(TABLE_NAMES.DIRECT_EMAILS))
    url.searchParams.set('pageSize', '100')
    url.searchParams.set('sort[0][field]', 'Created At')
    url.searchParams.set('sort[0][direction]', 'desc')
    if (offset) url.searchParams.set('offset', offset)
    const response = await fetch(url, { headers: getHeaders(), cache: 'no-store' })
    if (!response.ok) throw new Error(`Airtable direct email list failed ${response.status}: ${await response.text()}`)
    const json = await response.json() as AirtableList
    all.push(...json.records.map(mapRecord))
    offset = json.offset || ''
  } while (offset)
  return all
}
