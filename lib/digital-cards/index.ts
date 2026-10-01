import { getHeaders, getTableUrl, TABLE_NAMES } from '@/lib/airtable/config'

export type DigitalCardProject = {
  label: string
  url: string
}

export type DigitalCard = {
  id: string
  slug: string
  firstName: string
  lastName: string
  displayName: string
  title: string
  company: string
  email: string
  phone: string
  linkedin: string
  website: string
  photoUrl: string
  bio: string
  projects: DigitalCardProject[]
  active: boolean
  updatedAt: string
}

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

type AirtableListResponse = {
  records: AirtableRecord[]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseProjects(value: unknown): DigitalCardProject[] {
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.label === 'string' && typeof item.url === 'string')
      .map((item) => ({ label: item.label, url: item.url }))
  } catch {
    return []
  }
}

function mapRecord(record: AirtableRecord): DigitalCard {
  const f = record.fields
  return {
    id: record.id,
    slug: text(f['Slug']),
    firstName: text(f['First Name']),
    lastName: text(f['Last Name']),
    displayName: text(f['Display Name']),
    title: text(f['Title']),
    company: text(f['Company']),
    email: text(f['Email']),
    phone: text(f['Phone']),
    linkedin: text(f['LinkedIn']),
    website: text(f['Website']),
    photoUrl: text(f['Photo URL']),
    bio: text(f['Bio']),
    projects: parseProjects(f['Projects JSON']),
    active: f['Active'] === true,
    updatedAt: text(f['Updated At']),
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Airtable digital cards error ${response.status}: ${body}`)
  }

  return response.json() as Promise<T>
}

export async function listDigitalCards(): Promise<DigitalCard[]> {
  const data = await request<AirtableListResponse>(
    `${getTableUrl(TABLE_NAMES.DIGITAL_CARDS)}?sort%5B0%5D%5Bfield%5D=Display%20Name&sort%5B0%5D%5Bdirection%5D=asc`
  )
  return data.records.map(mapRecord)
}

export async function getDigitalCardBySlug(
  slug: string,
  options: { includeInactive?: boolean } = {}
): Promise<DigitalCard | null> {
  const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!normalized) return null

  const formula = options.includeInactive
    ? `LOWER({Slug})='${normalized}'`
    : `AND(LOWER({Slug})='${normalized}',{Active}=1)`

  const url = new URL(getTableUrl(TABLE_NAMES.DIGITAL_CARDS))
  url.searchParams.set('filterByFormula', formula)
  url.searchParams.set('maxRecords', '1')

  const data = await request<AirtableListResponse>(url.toString())
  return data.records[0] ? mapRecord(data.records[0]) : null
}

export async function updateDigitalCard(
  slug: string,
  input: Partial<Omit<DigitalCard, 'id' | 'slug' | 'updatedAt'>>
): Promise<DigitalCard> {
  const current = await getDigitalCardBySlug(slug, { includeInactive: true })
  if (!current) throw new Error('Digital card not found')

  const fields: Record<string, unknown> = {
    'Updated At': new Date().toISOString(),
  }

  const map: Array<[keyof typeof input, string]> = [
    ['firstName', 'First Name'],
    ['lastName', 'Last Name'],
    ['displayName', 'Display Name'],
    ['title', 'Title'],
    ['company', 'Company'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['linkedin', 'LinkedIn'],
    ['website', 'Website'],
    ['photoUrl', 'Photo URL'],
    ['bio', 'Bio'],
    ['active', 'Active'],
  ]

  for (const [key, airtableField] of map) {
    if (key in input) fields[airtableField] = input[key] ?? ''
  }

  if ('projects' in input) {
    fields['Projects JSON'] = JSON.stringify(input.projects ?? [])
  }

  const updated = await request<AirtableRecord>(
    `${getTableUrl(TABLE_NAMES.DIGITAL_CARDS)}/${current.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    }
  )

  return mapRecord(updated)
}

export function buildVCard(card: DigitalCard): string {
  const esc = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(card.lastName)};${esc(card.firstName)};;;`,
    `FN:${esc(card.displayName || `${card.firstName} ${card.lastName}`.trim())}`,
    card.company ? `ORG:${esc(card.company)}` : '',
    card.title ? `TITLE:${esc(card.title)}` : '',
    card.phone ? `TEL;TYPE=CELL:${esc(card.phone)}` : '',
    card.email ? `EMAIL;TYPE=INTERNET:${esc(card.email)}` : '',
    card.website ? `URL:${esc(card.website)}` : '',
    card.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${esc(card.linkedin)}` : '',
    card.bio ? `NOTE:${esc(card.bio)}` : '',
    'END:VCARD',
  ]

  return lines.filter(Boolean).join('\r\n')
}
