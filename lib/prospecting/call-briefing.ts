// Briefing avant appel (Trello #64). Pure helper, safe in client components.
// No AI: a factual summary of what the CRM already knows about the prospect,
// read in a few seconds before dialling.

import type { Activity, Task } from '@/types/domain'

export interface CallBriefing {
  calls: number
  emails: number
  linkedin: number
  /** Last two-way exchange (conversation, email or LinkedIn reply). */
  lastExchange: Activity | null
  /** Most recent activity carrying a note. */
  lastNote: Activity | null
  /** Up to three most recent activities, any channel, newest first. */
  recent: Activity[]
  /** Earliest open task on this prospect (the promised next action). */
  openTask: Task | null
}

const EXCHANGE_RESULTS = new Set(['CONVERSATION', 'MEETING_BOOKED', 'EMAIL_REPLY', 'LINKEDIN_REPLY'])

function byDateDesc(a: Activity, b: Activity) {
  return (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) || b.id.localeCompare(a.id)
}

export function buildCallBriefing(input: {
  targetId: string
  contactId: string | null
  activities: Activity[]
  tasks: Task[]
}): CallBriefing {
  const seen = new Set<string>()
  // Activities logged on the target, plus those logged on the contact elsewhere
  // (fiche Contact, campagne email), without counting any twice.
  const history = input.activities
    .filter((activity) =>
      activity.coldCallTargetId === input.targetId ||
      (input.contactId !== null && activity.contactId === input.contactId)
    )
    .filter((activity) => (seen.has(activity.id) ? false : (seen.add(activity.id), true)))
    .sort(byDateDesc)

  const openTask = input.tasks
    .filter((task) =>
      task.status === 'TODO' &&
      (task.coldCallTargetId === input.targetId || (input.contactId !== null && task.contactId === input.contactId))
    )
    .sort((a, b) => (Date.parse(a.dueAt || '') || Infinity) - (Date.parse(b.dueAt || '') || Infinity))[0] ?? null

  return {
    calls: history.filter((activity) => activity.type === 'CALL').length,
    emails: history.filter((activity) => activity.type === 'EMAIL').length,
    linkedin: history.filter((activity) => activity.type === 'LINKEDIN').length,
    lastExchange: history.find((activity) => activity.result !== null && EXCHANGE_RESULTS.has(activity.result)) ?? null,
    lastNote: history.find((activity) => Boolean(activity.notes && activity.notes.trim())) ?? null,
    recent: history.slice(0, 3),
    openTask,
  }
}
