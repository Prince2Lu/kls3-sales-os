// Dossiers oubliés (Trello #63). Pure helpers, safe in client components.
//
// A prospect is "forgotten" when someone already engaged with it (status
// Échange, Qualifié or À rappeler), it has no open TASK and nothing has
// happened on it for a while. The app only proposes a follow-up: a TASK is
// created only when the user clicks (never in bulk, never automatically).
//
// Opportunities are not listed here: Aujourd'hui already shows them in
// "À surveiller" (RDV and later, idle 7+ days) and "Sans prochaine action".

import type { Activity, CallStatus, ColdCallTarget, Task } from '@/types/domain'

export const FORGOTTEN_STATUSES: CallStatus[] = ['Échange', 'Qualifié', 'À rappeler']
export const FORGOTTEN_THRESHOLD_DAYS = 14

export interface ForgottenFile {
  targetId: string
  companyId: string
  contactId: string | null
  businessLineId: string
  status: CallStatus
  lastTouchAt: string
  idleDays: number
}

const DAY = 24 * 60 * 60 * 1000

function latest(values: Array<string | null | undefined>): string | null {
  let best: string | null = null
  let bestTime = -Infinity
  for (const value of values) {
    if (!value) continue
    const time = Date.parse(value)
    if (Number.isFinite(time) && time > bestTime) {
      best = value
      bestTime = time
    }
  }
  return best
}

export function findForgottenFiles(input: {
  targets: ColdCallTarget[]
  tasks: Task[]
  activities: Activity[]
  owner?: string | null
  now?: Date
  thresholdDays?: number
}): ForgottenFile[] {
  const now = input.now ?? new Date()
  const threshold = input.thresholdDays ?? FORGOTTEN_THRESHOLD_DAYS

  const withOpenTask = new Set(
    input.tasks.filter((task) => task.status === 'TODO' && task.coldCallTargetId).map((task) => task.coldCallTargetId as string)
  )
  const lastActivity = new Map<string, string>()
  for (const activity of input.activities) {
    if (!activity.coldCallTargetId) continue
    const current = lastActivity.get(activity.coldCallTargetId)
    lastActivity.set(activity.coldCallTargetId, latest([current, activity.date]) ?? activity.date)
  }

  const files: ForgottenFile[] = []
  for (const target of input.targets) {
    if (target.archived || target.opportunityId) continue
    if (!FORGOTTEN_STATUSES.includes(target.callStatus)) continue
    if (input.owner && target.owner !== input.owner) continue
    if (withOpenTask.has(target.id)) continue

    // Last sign of life: an activity, or a change on the target itself.
    const lastTouchAt = latest([lastActivity.get(target.id), target.updatedAt, target.createdAt])
    if (!lastTouchAt) continue
    const idleDays = Math.floor((now.getTime() - Date.parse(lastTouchAt)) / DAY)
    if (idleDays < threshold) continue

    files.push({
      targetId: target.id,
      companyId: target.companyId,
      contactId: target.contactId,
      businessLineId: target.businessLineId,
      status: target.callStatus,
      lastTouchAt,
      idleDays,
    })
  }

  // Most engaged first (Qualifié, Échange, À rappeler), then the oldest.
  return files.sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      b.idleDays - a.idleDays ||
      a.targetId.localeCompare(b.targetId)
  )
}

function statusRank(status: CallStatus): number {
  if (status === 'Qualifié') return 0
  if (status === 'Échange') return 1
  return 2
}

// Proposed follow-up: next business day at 09:30 local time.
export function proposedFollowUpAt(now: Date = new Date()): string {
  const due = new Date(now)
  due.setDate(due.getDate() + 1)
  if (due.getDay() === 6) due.setDate(due.getDate() + 2)
  if (due.getDay() === 0) due.setDate(due.getDate() + 1)
  due.setHours(9, 30, 0, 0)
  return due.toISOString()
}
