import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  createEmailEvent, createEmailSuppression, createTask, getEmailCampaigns, getEmailEvents, getEmailRecipients, getTasks,
  updateEmailRecipient,
} from '@/lib/airtable'
import { findOrCreateProspectingTarget } from '@/lib/prospecting/target-manager'
import type { EmailEvent, EmailRecipientStatus } from '@/types/domain'

export const runtime = 'nodejs'

function authorized(request: NextRequest): boolean {
  const expected = process.env.BREVO_WEBHOOK_SECRET
  if (!expected) return false
  const received = request.headers.get('x-kls3-webhook-secret') ?? request.nextUrl.searchParams.get('token') ?? ''
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

type TrackedEvent = EmailEvent['eventType']
const eventMap: Record<string, TrackedEvent> = {
  request: 'SENT', sent: 'SENT', delivered: 'DELIVERED', opened: 'OPENED', unique_opened: 'OPENED',
  click: 'CLICKED', clicks: 'CLICKED', soft_bounce: 'SOFT_BOUNCE', hard_bounce: 'HARD_BOUNCE',
  unsubscribe: 'UNSUBSCRIBED', spam: 'SPAM', complaint: 'SPAM', error: 'ERROR', invalid_email: 'ERROR',
}

function eventDate(payload: Record<string, unknown>): string {
  const value = payload.ts_event ?? payload.ts ?? payload.date
  if (typeof value === 'number') return new Date(value * 1000).toISOString()
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  return new Date().toISOString()
}

function resolveRecipientStatus(current: EmailRecipientStatus, incoming: EmailRecipientStatus): EmailRecipientStatus {
  const terminal: EmailRecipientStatus[] = ['UNSUBSCRIBED', 'SPAM', 'HARD_BOUNCE']
  if (terminal.includes(incoming)) return incoming
  if (terminal.includes(current)) return current
  const rank: Partial<Record<EmailRecipientStatus, number>> = { READY: 0, SENT: 1, DELIVERED: 2, OPENED: 3, CLICKED: 4, REPLIED: 5 }
  return (rank[incoming] ?? 0) >= (rank[current] ?? 0) ? incoming : current
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await request.json() as Record<string, unknown>
  const email = String(payload.email ?? '').trim().toLowerCase()
  const rawEvent = String(payload.event ?? '').toLowerCase()
  const status = eventMap[rawEvent]
  const brevoCampaignId = String(payload.campaignId ?? payload['campaign id'] ?? payload.camp_id ?? '')
  const url = String(payload.link ?? payload.url ?? '') || null
  const messageId = String(payload['message-id'] ?? payload.messageId ?? '') || null
  if (!email || !status) return NextResponse.json({ ignored: true })

  const campaigns = await getEmailCampaigns({ maxRecords: 100 })
  const campaign = campaigns.find((item) => !brevoCampaignId || item.brevoCampaignId === brevoCampaignId)
  if (!campaign) return NextResponse.json({ ignored: true, reason: 'campaign' })
  const recipients = await getEmailRecipients({ campaignId: campaign.id })
  const recipient = recipients.find((item) => item.email.toLowerCase() === email)
  if (!recipient) return NextResponse.json({ ignored: true, reason: 'recipient' })

  const occurredAt = eventDate(payload)
  const eventKey = createHash('sha256').update([campaign.id, email, rawEvent, occurredAt, url ?? '', messageId ?? ''].join('|')).digest('hex')
  if ((await getEmailEvents()).some((item) => item.eventKey === eventKey)) return NextResponse.json({ duplicate: true })
  await createEmailEvent({ eventKey, recipientId: recipient.id, eventType: status === 'ERROR' ? 'ERROR' : status, occurredAt, email, url, messageId, rawPayload: JSON.stringify(payload).slice(0, 90000) })

  const terminal = ['UNSUBSCRIBED', 'SPAM', 'HARD_BOUNCE'].includes(status) || rawEvent === 'invalid_email'
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
    const isCompany = recipient.recipientType === 'COMPANY'
    await createEmailSuppression({ email, companyId: isCompany ? recipient.companyId : undefined, contactId: !isCompany ? recipient.contactId ?? undefined : undefined,
      scope: isCompany ? 'COMPANY' : 'CONTACT', reason: rawEvent === 'invalid_email' ? 'INVALID_EMAIL' : nextStatus === 'UNSUBSCRIBED' ? 'UNSUBSCRIBED' : nextStatus === 'SPAM' ? 'SPAM_COMPLAINT' : 'HARD_BOUNCE', source: 'BREVO', details: `Webhook ${rawEvent}` })
  }

  const interestPattern = process.env.BREVO_INTEREST_URL_PATTERN ?? '/demo'
  if (incomingStatus === 'CLICKED' && url?.includes(interestPattern)) {
    const { target } = await findOrCreateProspectingTarget({ companyId: recipient.companyId, contactId: recipient.contactId, businessLineId: campaign.businessLineId,
      owner: campaign.createdBy, status: 'Email Flow' })
    await updateEmailRecipient(recipient.id, { prospectingTargetId: target.id })
    const openTasks = await getTasks({ coldCallTargetId: target.id, status: 'TODO', maxRecords: 1000 })
    if (!openTasks.length) {
      const due = new Date(); due.setUTCDate(due.getUTCDate() + 1); due.setUTCHours(9, 0, 0, 0)
      await createTask({ coldCallTargetId: target.id, contactId: recipient.contactId ?? undefined, type: 'FOLLOW_UP', dueAt: due.toISOString(), priority: 'HIGH', status: 'TODO',
        notes: `Signal d’intérêt : clic sur ${url}. Relancer cet office.`, owner: campaign.createdBy })
    }
  }
  return NextResponse.json({ received: true })
}
