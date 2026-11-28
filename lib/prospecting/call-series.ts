// Call series ("en série", Trello #59): pure helpers, safe in client components.
// The series walks the "À appeler maintenant" queue one prospect at a time and
// records each result with the same server action as the board, so the
// conversion rules are identical everywhere.

import type { ActivityResult, TaskType } from '@/types/domain'

export type FollowUpChoice = 'TOMORROW' | 'IN_3_DAYS' | 'IN_7_DAYS'

export const FOLLOW_UP_CHOICES: Array<{ value: FollowUpChoice; label: string; days: number }> = [
  { value: 'TOMORROW', label: 'Demain', days: 1 },
  { value: 'IN_3_DAYS', label: 'Dans 3 jours', days: 3 },
  { value: 'IN_7_DAYS', label: 'Dans 1 semaine', days: 7 },
]

// Results after which the prospect still needs a dated next action (CLAUDE.md
// section 82: Activity then Task). A booked meeting goes through the conversion
// engine; "not interested" and "wrong number" end the prospecting.
const NEEDS_FOLLOW_UP: ActivityResult[] = ['NO_ANSWER', 'VOICEMAIL', 'CONVERSATION', 'CALLBACK', 'EMAIL_REQUESTED']

export function needsFollowUp(result: ActivityResult): boolean {
  return NEEDS_FOLLOW_UP.includes(result)
}

export function followUpTaskType(result: ActivityResult): TaskType {
  return result === 'EMAIL_REQUESTED' ? 'EMAIL' : 'CALL'
}

// Due date at 09:30 local time, moved to Monday when it falls on a weekend.
export function followUpDueAt(choice: FollowUpChoice, now: Date = new Date()): string {
  const days = FOLLOW_UP_CHOICES.find((item) => item.value === choice)?.days ?? 1
  const due = new Date(now)
  due.setDate(due.getDate() + days)
  const weekday = due.getDay()
  if (weekday === 6) due.setDate(due.getDate() + 2)
  if (weekday === 0) due.setDate(due.getDate() + 1)
  due.setHours(9, 30, 0, 0)
  return due.toISOString()
}

export interface SeriesSummary {
  calls: number
  conversations: number
  meetings: number
  skipped: number
  minutes: number
}

export function summarizeSeries(
  outcomes: Array<ActivityResult | 'SKIPPED'>,
  startedAt: Date,
  endedAt: Date = new Date()
): SeriesSummary {
  const calls = outcomes.filter((outcome) => outcome !== 'SKIPPED')
  return {
    calls: calls.length,
    // A booked meeting implies a conversation took place.
    conversations: calls.filter((outcome) => outcome === 'CONVERSATION' || outcome === 'MEETING_BOOKED').length,
    meetings: calls.filter((outcome) => outcome === 'MEETING_BOOKED').length,
    skipped: outcomes.length - calls.length,
    minutes: Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)),
  }
}
