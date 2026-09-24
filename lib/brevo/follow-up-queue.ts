import type { Activity, ColdCallTarget, EmailCampaign, EmailEvent, EmailRecipient, EmailSuppression, Task } from '@/types/domain'

export type SignalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'NONE'

export interface FollowUpRow {
  key: string
  email: string
  companyId: string
  contactId: string | null
  recipientId: string
  businessLineId: string
  campaignNames: string[]
  opens: number
  clicks: number
  totalClicks: number
  lastSignalAt: string | null
  priority: SignalPriority
  reason: string
  state: 'AVAILABLE' | 'TASK_OPEN' | 'CALLED' | 'REPLIED' | 'EXCLUDED' | 'TEST'
  taskId: string | null
  testTaskId: string | null
  testTaskOwner: string | null
}

const rank: Record<SignalPriority, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }
const terminalStatuses = new Set(['UNSUBSCRIBED', 'SPAM', 'HARD_BOUNCE'])

function parisDay(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

export function buildFollowUpQueue(input: {
  campaigns: EmailCampaign[]
  recipients: EmailRecipient[]
  events: EmailEvent[]
  tasks: Task[]
  targets: ColdCallTarget[]
  activities: Activity[]
  suppressions: EmailSuppression[]
  interestUrlPattern: string
  testEmail: string | null
}): FollowUpRow[] {
  const { campaigns, recipients, events, tasks, targets, activities, suppressions, interestUrlPattern, testEmail } = input
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]))
  const eventsByRecipient = new Map<string, EmailEvent[]>()
  for (const event of events) {
    const collection = eventsByRecipient.get(event.recipientId) ?? []
    collection.push(event)
    eventsByRecipient.set(event.recipientId, collection)
  }
  const groups = new Map<string, EmailRecipient[]>()
  for (const recipient of recipients) {
    if (!campaignById.has(recipient.campaignId)) continue
    const campaign = campaignById.get(recipient.campaignId)!
    const key = `${campaign.businessLineId}:${recipient.email.trim().toLowerCase()}`
    groups.set(key, [...(groups.get(key) ?? []), recipient])
  }

  const rows: FollowUpRow[] = []
  for (const [key, group] of groups) {
    const latest = [...group].sort((a, b) => (b.lastEventAt ?? b.createdAt).localeCompare(a.lastEventAt ?? a.createdAt))[0]
    const email = latest.email.toLowerCase()
    const groupEvents = group.flatMap((item) => eventsByRecipient.get(item.id) ?? [])
    const clicks = groupEvents.filter((event) => event.eventType === 'CLICKED' && !!event.url && event.url.includes(interestUrlPattern))
    const opens = group.reduce((total, item) => total + item.openCount, 0)
    const totalClicks = group.reduce((total, item) => total + item.clickCount, 0)
    const lastClick = clicks.map((event) => Date.parse(event.occurredAt)).filter(Number.isFinite).sort((a, b) => b - a)[0]
    const clickDays = new Set(clicks.filter((event) => lastClick - Date.parse(event.occurredAt) <= 14 * 86_400_000).map((event) => parisDay(event.occurredAt)))
    let priority: SignalPriority = 'NONE'
    let reason = 'Mail délivré, aucun signal'
    if (opens > 0) { priority = opens > 1 ? 'MEDIUM' : 'LOW'; reason = `${opens} ouverture(s), aucun clic sur le CTA` }
    if (clicks.length) { priority = 'HIGH'; reason = `${clicks.length} clic(s) sur le CTA` }
    if (clickDays.size > 1) { priority = 'URGENT'; reason = `Retour sur le CTA sur ${clickDays.size} jours distincts` }
    const businessLineId = campaignById.get(latest.campaignId)!.businessLineId
    const keyMarker = `[BREVO_TEST_CALL:${key}]`
    const testTask = tasks.find((task) => task.status === 'TODO' && task.notes?.includes(keyMarker))
    const relatedTargetIds = new Set(targets.filter((item) => !item.archived && item.businessLineId === businessLineId && group.some((r) => r.companyId === item.companyId && r.contactId === item.contactId)).map((item) => item.id))
    const inPipeline = targets.some((item) => relatedTargetIds.has(item.id) && !!item.opportunityId)
    const activeTask = tasks.find((task) => task.status === 'TODO' && !task.notes?.includes('[BREVO_TEST_CALL:') &&
      ['CALL', 'FOLLOW_UP'].includes(task.type) && ((!!task.coldCallTargetId && relatedTargetIds.has(task.coldCallTargetId)) || (!!latest.contactId && task.contactId === latest.contactId)))
      ?? tasks.find((task) => task.status === 'TODO' && task.notes?.includes(`[EMAIL_QUEUE:${key}]`))
    const lastSignalAt = group.map((item) => item.lastEventAt).filter((value): value is string => !!value).sort().at(-1) ?? null
    const alreadyCalled = !!lastSignalAt && (activities.some((activity) => activity.type === 'CALL' && activity.date >= lastSignalAt && (
      (!!latest.contactId && activity.contactId === latest.contactId) || (!!activity.coldCallTargetId && relatedTargetIds.has(activity.coldCallTargetId))
    )) || tasks.some((task) => task.status === 'DONE' && task.type === 'CALL' && !task.notes?.includes('[BREVO_TEST_CALL:') &&
      !!task.completedAt && task.completedAt >= lastSignalAt && (
      (!!latest.contactId && task.contactId === latest.contactId) || (!!task.coldCallTargetId && relatedTargetIds.has(task.coldCallTargetId))
    )))
    const suppressed = suppressions.some((item) => item.active && ((item.scope === 'EMAIL' && item.email.toLowerCase() === email) ||
      (item.scope === 'COMPANY' && group.some((recipient) => recipient.companyId === item.companyId)) ||
      (item.scope === 'CONTACT' && group.some((recipient) => recipient.contactId && recipient.contactId === item.contactId))))
    const state: FollowUpRow['state'] = email === testEmail?.toLowerCase() ? 'TEST'
      : suppressed || group.some((item) => terminalStatuses.has(item.status)) || ['SOFT_BOUNCE', 'FAILED', 'EXCLUDED'].includes(latest.status) ? 'EXCLUDED'
      : group.some((item) => item.status === 'REPLIED') ? 'REPLIED'
      : inPipeline || alreadyCalled ? 'CALLED' : activeTask ? 'TASK_OPEN' : 'AVAILABLE'
    rows.push({ key, email, companyId: latest.companyId, contactId: latest.contactId, recipientId: latest.id, businessLineId,
      campaignNames: [...new Set(group.map((item) => campaignById.get(item.campaignId)!.name))], opens, clicks: clicks.length, totalClicks,
      lastSignalAt, priority, reason, state, taskId: activeTask?.id ?? null,
      testTaskId: testTask?.id ?? null, testTaskOwner: testTask?.owner ?? null })
  }
  return rows.sort((a, b) => {
    const availableA = a.state === 'AVAILABLE' ? 1 : 0
    const availableB = b.state === 'AVAILABLE' ? 1 : 0
    return availableB - availableA || rank[b.priority] - rank[a.priority] || (b.lastSignalAt ?? '').localeCompare(a.lastSignalAt ?? '')
  })
}
