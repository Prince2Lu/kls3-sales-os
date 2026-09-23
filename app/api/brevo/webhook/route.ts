import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  createEmailEvent, createEmailSuppression, createTask, getEmailCampaigns, getEmailEventByKey, getEmailRecipients, getTasks,
  updateEmailRecipient,
} from '@/lib/airtable'
import { findOrCreateProspectingTarget } from '@/lib/prospecting/target-manager'
import { logger } from '@/lib/observability/logger'
import { nextBusinessDayAtNineParis } from '@/lib/utils/business-day'
import type { EmailEvent, EmailRecipientStatus } from '@/types/domain'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'brevo-webhook', checkedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

function authorized(request: NextRequest): boolean {
  const expected = process.env.BREVO_WEBHOOK_SECRET
  if (!expected) return false
  const received = request.headers.get('x-kls3-webhook-secret') ?? ''
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

type TrackedEvent = EmailEvent['eventType']
const eventMap: Record<string, TrackedEvent> = {
  request: 'SENT', sent: 'SENT', delivered: 'DELIVERED', opened: 'OPENED', unique_opened: 'OPENED',
  click: 'CLICKED', clicks: 'CLICKED', soft_bounce: 'SOFT_BOUNCE', softbounce: 'SOFT_BOUNCE',
  hard_bounce: 'HARD_BOUNCE', hardbounce: 'HARD_BOUNCE',
  unsubscribe: 'UNSUBSCRIBED', unsubscribed: 'UNSUBSCRIBED',
  spam: 'SPAM', complaint: 'SPAM', error: 'ERROR', blocked: 'ERROR', invalid: 'ERROR', invalid_email: 'ERROR',
}

function eventDate(payload: Record<string, unknown>): string {
  const value = payload.ts_event ?? payload.ts ?? payload.date
  if (typeof value === 'number') return new Date(value * 1000).toISOString()
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  return new Date().toISOString()
}

function resolveRecipientStatus(current: EmailRecipientStatus, incoming: EmailRecipientStatus): EmailRecipientStatus {
  const terminal: EmailRecipientStatus[] = ['UNSUBSCRIBED', 'SPAM', 'HARD_BOUNCE', 'FAILED']
  if (terminal.includes(incoming)) return incoming
  if (terminal.includes(current)) return current
  const rank: Partial<Record<EmailRecipientStatus, number>> = { READY: 0, SENT: 1, DELIVERED: 2, OPENED: 3, CLICKED: 4, REPLIED: 5 }
  return (rank[incoming] ?? 0) >= (rank[current] ?? 0) ? incoming : current
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    logger.warn('brevo.webhook.unauthorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let payload: Record<string, unknown>
  try {
    payload = await request.json() as Record<string, unknown>
  } catch {
    logger.warn('brevo.webhook.invalid_json')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const email = String(payload.email ?? '').trim().toLowerCase()
  const rawEvent = String(payload.event ?? '').toLowerCase()
  const status = eventMap[rawEvent]
  const brevoCampaignId = String(payload.campaignId ?? payload.campaign_id ?? payload['campaign id'] ?? payload.camp_id ?? '')
  const url = String(payload.link ?? payload.url ?? payload.URL ?? '') || null
  const messageId = String(payload['message-id'] ?? payload.messageId ?? '') || null
  if (!email || !status || !brevoCampaignId) {
    logger.warn('brevo.webhook.ignored', { reason: 'missing_required_field', rawEvent, hasEmail: !!email, hasCampaignId: !!brevoCampaignId })
    return NextResponse.json({ ignored: true, reason: 'missing_required_field' })
  }

  const campaigns = await getEmailCampaigns({ maxRecords: 100 })
  const campaign = campaigns.find((item) => item.brevoCampaignId === brevoCampaignId)
  if (!campaign) return NextResponse.json({ ignored: true, reason: 'campaign' })
  const recipients = await getEmailRecipients({ campaignId: campaign.id })
  const recipient = recipients.find((item) => item.email.toLowerCase() === email)
  if (!recipient) return NextResponse.json({ ignored: true, reason: 'recipient' })

  const occurredAt = eventDate(payload)
  const providerEventId = String(payload.event_uuid ?? payload.eventUuid ?? '')
  const eventKey = createHash('sha256').update(providerEventId || [campaign.id, email, rawEvent, occurredAt, url ?? '', messageId ?? ''].join('|')).digest('hex')
  if (await getEmailEventByKey(eventKey)) return NextResponse.json({ duplicate: true })
  await createEmailEvent({ eventKey, recipientId: recipient.id, eventType: status === 'ERROR' ? 'ERROR' : status, occurredAt, email, url, messageId, rawPayload: JSON.stringify(payload).slice(0, 90000) })

  const invalidEmail = rawEvent === 'invalid' || rawEvent === 'invalid_email'
  const terminal = ['UNSUBSCRIBED', 'SPAM', 'HARD_BOUNCE'].includes(status) || invalidEmail
  const incomingStatus: EmailRecipientStatus = status === 'ERROR' ? 'FAILED' : status
  const nextStatus = resolveRecipientStatus(recipient.status, incomingStatus)
  await updateEmailRecipient(recipient.id, {
    status: nextStatus,
    openCount: recipient.openCount + (incomingStatus === 'OPENED' ? 1 : 0),
    clickCount: recipient.clickCount + (incomingStatus === 'CLICKED' ? 1 : 0),
    lastEventAt: occurredAt,
    lastClickUrl: url ?? undefined,
    exclusionReason: terminal ? rawEvent : undefined,
  })

  if (terminal) {
    await createEmailSuppression({ email, companyId: recipient.companyId, contactId: recipient.contactId ?? undefined,
      scope: 'EMAIL', reason: invalidEmail ? 'INVALID_EMAIL' : nextStatus === 'UNSUBSCRIBED' ? 'UNSUBSCRIBED' : nextStatus === 'SPAM' ? 'SPAM_COMPLAINT' : 'HARD_BOUNCE', source: 'BREVO', details: `Webhook ${rawEvent}` })
  }

  const interestPattern = process.env.BREVO_INTEREST_URL_PATTERN ?? '/demo'
  if (incomingStatus === 'CLICKED' && nextStatus === 'CLICKED' && url?.includes(interestPattern)) {
    const { target } = await findOrCreateProspectingTarget({ companyId: recipient.companyId, contactId: recipient.contactId, businessLineId: campaign.businessLineId,
      owner: campaign.createdBy, status: 'Email Flow' })
    await updateEmailRecipient(recipient.id, { prospectingTargetId: target.id })
    const openTasks = await getTasks({ coldCallTargetId: target.id, status: 'TODO', maxRecords: 1000 })
    const taskMarker = `[BREVO_INTEREST:${recipient.id}]`
    if (!openTasks.some((task) => task.notes?.includes(taskMarker))) {
      const due = nextBusinessDayAtNineParis()
      await createTask({ coldCallTargetId: target.id, contactId: recipient.contactId ?? undefined, type: 'FOLLOW_UP', dueAt: due.toISOString(), priority: 'HIGH', status: 'TODO',
        notes: `${taskMarker} Signal d’intérêt : clic sur ${url}. Relancer cet office.`, owner: campaign.createdBy })
    }
  }
  logger.info('brevo.webhook.processed', { campaignId: campaign.id, recipientId: recipient.id, eventType: status })
  return NextResponse.json({ received: true })
}
