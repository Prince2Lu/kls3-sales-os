import { getHeaders, getTableUrl, TABLE_NAMES } from '@/lib/airtable/config'

export const CARD_EVENT_TYPES = [
  'card_view',
  'vcard_download',
  'phone_click',
  'email_click',
  'linkedin_click',
  'website_click',
  'project_click',
] as const

export type CardEventType = (typeof CARD_EVENT_TYPES)[number]

export type CardEvent = {
  id: string
  eventId: string
  cardSlug: string
  eventType: CardEventType
  occurredAt: string
  visitorId: string
  source: string
  campaign: string
  projectLabel: string
  pageReferrer: string
  cardRef: string
}

type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

type AirtableListResponse = {
  records: AirtableRecord[]
  offset?: string
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function eventType(value: unknown): CardEventType | '' {
  const name =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && 'name' in value
        ? text((value as { name?: unknown }).name)
        : ''
  return CARD_EVENT_TYPES.includes(name as CardEventType) ? (name as CardEventType) : ''
}

function mapRecord(record: AirtableRecord): CardEvent | null {
  const f = record.fields
  const type = eventType(f['Event Type'])
  if (!type) return null

  return {
    id: record.id,
    eventId: text(f['Event ID']),
    cardSlug: text(f['Card Slug']),
    eventType: type,
    occurredAt: text(f['Occurred At']),
    visitorId: text(f['Visitor ID']),
    source: text(f['Source']) || 'direct',
    campaign: text(f['Campaign']),
    projectLabel: text(f['Project Label']),
    pageReferrer: text(f['Page Referrer']),
    cardRef: text(f['Card Ref']),
  }
}

function sanitize(value: string, max = 200) {
  return value.trim().slice(0, max)
}

export async function recordCardEvent(input: {
  cardSlug: string
  eventType: CardEventType
  visitorId?: string
  source?: string
  campaign?: string
  projectLabel?: string
  pageReferrer?: string
  cardRef?: string
}) {
  const now = new Date().toISOString()
  const eventId = crypto.randomUUID()

  const response = await fetch(getTableUrl(TABLE_NAMES.CARD_EVENTS), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      records: [
        {
          fields: {
            'Event ID': eventId,
            'Card Slug': sanitize(input.cardSlug, 80),
            'Event Type': input.eventType,
            'Occurred At': now,
            'Visitor ID': sanitize(input.visitorId || '', 100),
            Source: sanitize(input.source || 'direct', 100),
            Campaign: sanitize(input.campaign || '', 100),
            'Project Label': sanitize(input.projectLabel || '', 160),
            'Page Referrer': sanitize(input.pageReferrer || '', 500),
            'Card Ref': sanitize(input.cardRef || '', 100),
          },
        },
      ],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Airtable card analytics error ${response.status}: ${body}`)
  }
}

export async function listCardEvents(): Promise<CardEvent[]> {
  const all: CardEvent[] = []
  let offset = ''

  do {
    const url = new URL(getTableUrl(TABLE_NAMES.CARD_EVENTS))
    url.searchParams.set('pageSize', '100')
    url.searchParams.set('sort[0][field]', 'Occurred At')
    url.searchParams.set('sort[0][direction]', 'desc')
    if (offset) url.searchParams.set('offset', offset)

    const response = await fetch(url, {
      headers: getHeaders(),
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Airtable card analytics error ${response.status}: ${body}`)
    }

    const data = (await response.json()) as AirtableListResponse
    all.push(...data.records.map(mapRecord).filter((item): item is CardEvent => item !== null))
    offset = data.offset || ''
  } while (offset)

  return all
}

export type CardAnalyticsSummary = {
  views: number
  uniqueVisitors: number
  vcardDownloads: number
  phoneClicks: number
  emailClicks: number
  linkedinClicks: number
  websiteClicks: number
  projectClicks: number
  engagedVisitors: number
  engagementRate: number
  saveRate: number
  sources: Array<{ name: string; count: number }>
  projects: Array<{ name: string; count: number }>
  daily: Array<{ date: string; views: number; actions: number }>
  recent: CardEvent[]
}

export function summarizeCardEvents(events: CardEvent[]): CardAnalyticsSummary {
  const count = (type: CardEventType) => events.filter((e) => e.eventType === type).length
  const views = count('card_view')
  const uniqueVisitorsSet = new Set(
    events.filter((e) => e.visitorId).map((e) => e.visitorId)
  )
  const engagedVisitorsSet = new Set(
    events
      .filter((e) => e.visitorId && e.eventType !== 'card_view')
      .map((e) => e.visitorId)
  )

  const bySource = new Map<string, number>()
  const byProject = new Map<string, number>()
  const byDay = new Map<string, { views: number; actions: number }>()

  for (const event of events) {
    bySource.set(event.source || 'direct', (bySource.get(event.source || 'direct') || 0) + 1)

    if (event.eventType === 'project_click' && event.projectLabel) {
      byProject.set(event.projectLabel, (byProject.get(event.projectLabel) || 0) + 1)
    }

    const date = event.occurredAt.slice(0, 10)
    if (date) {
      const row = byDay.get(date) || { views: 0, actions: 0 }
      if (event.eventType === 'card_view') row.views += 1
      else row.actions += 1
      byDay.set(date, row)
    }
  }

  const uniqueVisitors = uniqueVisitorsSet.size
  const engagedVisitors = engagedVisitorsSet.size
  const vcardDownloads = count('vcard_download')

  return {
    views,
    uniqueVisitors,
    vcardDownloads,
    phoneClicks: count('phone_click'),
    emailClicks: count('email_click'),
    linkedinClicks: count('linkedin_click'),
    websiteClicks: count('website_click'),
    projectClicks: count('project_click'),
    engagedVisitors,
    engagementRate: uniqueVisitors ? Math.round((engagedVisitors / uniqueVisitors) * 100) : 0,
    saveRate: views ? Math.round((vcardDownloads / views) * 100) : 0,
    sources: [...bySource.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    projects: [...byProject.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    daily: [...byDay.entries()]
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    recent: events.slice(0, 20),
  }
}
