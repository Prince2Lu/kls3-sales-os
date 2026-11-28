// "À appeler maintenant": an explainable call queue for Prospection (Trello #57).
// Pure and deterministic: a few readable rules in a fixed order, no hidden score.
// A campaign click only raises priority; it never creates a Task or an Opportunity.

import type { Activity, ColdCallTarget, Task } from '@/types/domain'

export type CallQueueRule =
  | 'OVERDUE_TASK'
  | 'TASK_TODAY'
  | 'CAMPAIGN_CLICK'
  | 'CALLBACK_NO_DATE'
  | 'NEVER_CALLED'
  | 'OLDEST_CONTACT'

/** Rule order = queue order. Lower comes first. */
export const CALL_QUEUE_RULES: Record<CallQueueRule, { order: number; label: string }> = {
  OVERDUE_TASK: { order: 1, label: 'Relance en retard' },
  TASK_TODAY: { order: 2, label: "Relance prévue aujourd'hui" },
  CAMPAIGN_CLICK: { order: 3, label: 'Clic campagne récent' },
  CALLBACK_NO_DATE: { order: 4, label: 'À rappeler, sans date' },
  NEVER_CALLED: { order: 5, label: 'Jamais appelé' },
  OLDEST_CONTACT: { order: 6, label: 'Dernier contact le plus ancien' },
}

/** Campaign signal for one contact, as computed by the email follow-up queue. */
export interface CampaignSignal {
  businessLineId: string
  companyId: string
  contactId: string | null
  priority: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  state: string
  reason: string
  lastSignalAt: string | null
}

export interface CallQueueItem {
  targetId: string
  rule: CallQueueRule
  label: string
  reason: string
  /** Date used to order items inside the same rule (oldest first). */
  sortDate: string
  taskId: string | null
}

/** Statuses worth a phone call. Email Flow, wrong number and refusals are left out. */
const CALLABLE_STATUSES = new Set(['À appeler', 'À rappeler', 'Échange', 'Qualifié'])
const CALL_TASK_TYPES = new Set(['CALL', 'FOLLOW_UP'])
const CAMPAIGN_WINDOW_DAYS = 14
const DAY_MS = 86_400_000

function parisDay(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(typeof value === 'string' ? new Date(value) : value)
}

function parisTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function frenchDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short' }).format(new Date(value))
}

function daysBetween(from: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(from)) / DAY_MS))
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`
}

export function buildCallQueue(input: {
  targets: ColdCallTarget[]
  tasks: Task[]
  activities: Activity[]
  signals?: CampaignSignal[]
  now?: Date
}): CallQueueItem[] {
  const now = input.now ?? new Date()
  const today = parisDay(now)
  const items: CallQueueItem[] = []

  for (const target of input.targets) {
    if (target.archived || target.opportunityId || !CALLABLE_STATUSES.has(target.callStatus)) continue

    const openTasks = input.tasks
      .filter((task) => task.status === 'TODO' && CALL_TASK_TYPES.has(task.type) && (
        task.coldCallTargetId === target.id ||
        (!task.coldCallTargetId && !task.opportunityId && !!target.contactId && task.contactId === target.contactId)
      ))
      .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))
    const nextTask = openTasks[0] ?? null

    const calls = input.activities
      .filter((activity) => activity.coldCallTargetId === target.id && activity.type === 'CALL')
      .sort((a, b) => b.date.localeCompare(a.date))
    const lastContact = input.activities
      .filter((activity) => activity.coldCallTargetId === target.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null

    // A dated follow-up decides on its own: overdue, today, or not yet.
    if (nextTask?.dueAt) {
      const dueDay = parisDay(nextTask.dueAt)
      if (dueDay < today) {
        const late = daysBetween(nextTask.dueAt, now)
        items.push(item(target, 'OVERDUE_TASK', `Prévue le ${frenchDate(nextTask.dueAt)}${late ? `, ${plural(late, 'jour')} de retard` : ''}`, nextTask.dueAt, nextTask.id))
        continue
      }
      if (dueDay === today) {
        items.push(item(target, 'TASK_TODAY', `Prévue à ${parisTime(nextTask.dueAt)}`, nextTask.dueAt, nextTask.id))
        continue
      }
      // Follow-up planned later: not in today's queue.
      continue
    }

    const signal = (input.signals ?? []).find((candidate) =>
      candidate.businessLineId === target.businessLineId &&
      candidate.companyId === target.companyId &&
      (candidate.contactId ?? null) === (target.contactId ?? null))
    const lastCallAt = calls[0]?.date ?? null
    if (signal && (signal.priority === 'HIGH' || signal.priority === 'URGENT') && signal.state === 'AVAILABLE' &&
        signal.lastSignalAt && daysBetween(signal.lastSignalAt, now) <= CAMPAIGN_WINDOW_DAYS &&
        (!lastCallAt || lastCallAt < signal.lastSignalAt)) {
      items.push(item(target, 'CAMPAIGN_CLICK', `${signal.reason}, le ${frenchDate(signal.lastSignalAt)}`, invert(signal.lastSignalAt), null))
      continue
    }

    if (target.callStatus === 'À rappeler') {
      items.push(item(target, 'CALLBACK_NO_DATE', lastContact
        ? `Dernier contact le ${frenchDate(lastContact.date)}, aucune date de rappel`
        : 'Aucune date de rappel', lastContact?.date ?? target.updatedAt, null))
      continue
    }

    if (!calls.length) {
      items.push(item(target, 'NEVER_CALLED', `En prospection depuis le ${frenchDate(target.createdAt)}`, target.createdAt, null))
      continue
    }

    const since = daysBetween(lastContact!.date, now)
    items.push(item(target, 'OLDEST_CONTACT', `Dernier contact il y a ${plural(since, 'jour')}`, lastContact!.date, null))
  }

  return items.sort((a, b) =>
    CALL_QUEUE_RULES[a.rule].order - CALL_QUEUE_RULES[b.rule].order ||
    a.sortDate.localeCompare(b.sortDate) ||
    a.targetId.localeCompare(b.targetId))
}

function item(target: ColdCallTarget, rule: CallQueueRule, reason: string, sortDate: string, taskId: string | null): CallQueueItem {
  return { targetId: target.id, rule, label: CALL_QUEUE_RULES[rule].label, reason, sortDate, taskId }
}

/** Most recent signal first while the queue sorts ascending. */
function invert(isoDate: string): string {
  return String(9_999_999_999_999 - Date.parse(isoDate)).padStart(13, '0')
}
