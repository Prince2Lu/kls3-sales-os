// Goals vs actual (Trello #61). Pure helpers, safe in client components.
//
// GOALS rows are configured by hand in Airtable (CLAUDE.md section 29). The
// Metric and Period fields are free single selects, so this module only
// recognises a known list of codes (with French/English aliases) and says so
// when it does not: an unknown metric is shown as such, never as a fake 0.
//
// Business rules:
// - Activities are past actions (section 26). Calls, conversations and
//   meetings are counted from ACTIVITIES only, never from TASKS.
// - Economic results come from VALUE_EVENTS with status CONFIRMED or PAID
//   only (sections 10 and 28), never from the "Gagné" stage.
// - An activity belongs to a business line through its prospecting target,
//   else through its opportunity (same rule as the Dashboard). Activities linked to neither are not
//   attributed to any business line.

import type {
  Activity,
  ColdCallTarget,
  Goal,
  Opportunity,
  EventType,
  ValueEvent,
} from '@/types/domain'
import type { DateRange } from '@/lib/utils/period'

export type GoalMetric =
  | 'CALLS'
  | 'CONVERSATIONS'
  | 'MEETINGS'
  | 'OPPORTUNITIES'
  | 'PAID_MEETINGS'
  | 'SIGNATURES'
  | 'NEW_SUBSCRIPTIONS'
  | 'REVENUE'
  | 'NEW_MRR'

export type GoalPeriodKind = 'week' | 'month' | 'quarter' | 'year'

export const GOAL_METRIC_LABELS: Record<GoalMetric, { label: string; unit: 'count' | 'currency' }> = {
  CALLS: { label: 'Appels', unit: 'count' },
  CONVERSATIONS: { label: 'Conversations', unit: 'count' },
  MEETINGS: { label: 'RDV pris', unit: 'count' },
  OPPORTUNITIES: { label: 'Opportunités créées', unit: 'count' },
  PAID_MEETINGS: { label: 'RDV rémunérés', unit: 'count' },
  SIGNATURES: { label: 'Signatures', unit: 'count' },
  NEW_SUBSCRIPTIONS: { label: 'Nouveaux clients', unit: 'count' },
  REVENUE: { label: 'Revenu confirmé', unit: 'currency' },
  NEW_MRR: { label: 'Nouveau MRR', unit: 'currency' },
}

const METRIC_ALIASES: Record<string, GoalMetric> = {
  CALLS: 'CALLS',
  CALL: 'CALLS',
  APPELS: 'CALLS',
  CONVERSATIONS: 'CONVERSATIONS',
  CONVERSATION: 'CONVERSATIONS',
  MEETINGS: 'MEETINGS',
  MEETINGS_BOOKED: 'MEETINGS',
  MEETING_BOOKED: 'MEETINGS',
  RDV: 'MEETINGS',
  RDV_PRIS: 'MEETINGS',
  OPPORTUNITIES: 'OPPORTUNITIES',
  OPPORTUNITES: 'OPPORTUNITIES',
  PAID_MEETINGS: 'PAID_MEETINGS',
  PAID_MEETING: 'PAID_MEETINGS',
  RDV_REMUNERES: 'PAID_MEETINGS',
  SIGNATURES: 'SIGNATURES',
  SIGNATURE: 'SIGNATURES',
  SIGNED_DEALS: 'SIGNATURES',
  SIGNED_DEAL: 'SIGNATURES',
  SIGNED_PROJECTS: 'SIGNATURES',
  SIGNED_PROJECT: 'SIGNATURES',
  CONTRATS: 'SIGNATURES',
  NEW_CUSTOMERS: 'NEW_SUBSCRIPTIONS',
  NOUVEAUX_CLIENTS: 'NEW_SUBSCRIPTIONS',
  NEW_SUBSCRIPTIONS: 'NEW_SUBSCRIPTIONS',
  SUBSCRIPTIONS: 'NEW_SUBSCRIPTIONS',
  SUBSCRIPTION_STARTED: 'NEW_SUBSCRIPTIONS',
  ABONNEMENTS: 'NEW_SUBSCRIPTIONS',
  REVENUE: 'REVENUE',
  REVENU: 'REVENUE',
  CA: 'REVENUE',
  CA_SIGNE: 'REVENUE',
  NEW_MRR: 'NEW_MRR',
  MRR: 'NEW_MRR',
  NOUVEAU_MRR: 'NEW_MRR',
}

const PERIOD_ALIASES: Record<string, GoalPeriodKind> = {
  WEEK: 'week',
  WEEKLY: 'week',
  SEMAINE: 'week',
  HEBDO: 'week',
  HEBDOMADAIRE: 'week',
  MONTH: 'month',
  MONTHLY: 'month',
  MOIS: 'month',
  MENSUEL: 'month',
  QUARTER: 'quarter',
  QUARTERLY: 'quarter',
  TRIMESTRE: 'quarter',
  TRIMESTRIEL: 'quarter',
  YEAR: 'year',
  YEARLY: 'year',
  ANNUAL: 'year',
  ANNEE: 'year',
  AN: 'year',
  ANNUEL: 'year',
}

const SIGNATURE_EVENTS: EventType[] = ['SIGNED_DEAL', 'SIGNED_PROJECT']

function normalizeCode(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function normalizeGoalMetric(value: string | null | undefined): GoalMetric | null {
  return METRIC_ALIASES[normalizeCode(value)] ?? null
}

export function normalizeGoalPeriod(value: string | null | undefined): GoalPeriodKind | null {
  return PERIOD_ALIASES[normalizeCode(value)] ?? null
}

// "2026-11-01" is read as a local calendar day, not as UTC midnight.
function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function endOfDay(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

// Calendar window of the given kind that contains `date` (weeks start on Monday).
export function calendarWindow(kind: GoalPeriodKind, date: Date): DateRange {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  let end: Date
  if (kind === 'week') {
    const day = start.getDay()
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
    end = new Date(start)
    end.setDate(end.getDate() + 6)
  } else if (kind === 'month') {
    start.setDate(1)
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  } else if (kind === 'quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1)
    end = new Date(start.getFullYear(), start.getMonth() + 3, 0)
  } else {
    start.setMonth(0, 1)
    end = new Date(start.getFullYear(), 11, 31)
  }
  return { start, end: endOfDay(end) }
}

// The window a goal is measured on, for a dashboard period ending at `reference`.
// Explicit Start/End dates win; otherwise the calendar period containing the
// reference date; a goal with neither is not measurable.
export function goalWindow(goal: Goal, reference: Date): DateRange | null {
  const start = parseDay(goal.startDate)
  const end = parseDay(goal.endDate)
  const kind = normalizeGoalPeriod(goal.period)
  if (start && end) return { start, end: endOfDay(end) }
  if (kind) {
    const calendar = calendarWindow(kind, start ?? reference)
    return { start: start ?? calendar.start, end: end ? endOfDay(end) : calendar.end }
  }
  return null
}

function overlaps(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && b.start <= a.end
}

function inRange(value: string | null | undefined, range: DateRange): boolean {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end
}

export interface GoalData {
  activities: Activity[]
  opportunities: Opportunity[]
  coldCallTargets: ColdCallTarget[]
  valueEvents: ValueEvent[]
}

function activityBusinessLine(
  activity: Activity,
  opportunityBl: Map<string, string>,
  targetBl: Map<string, string>
): string | null {
  // Same order as the Dashboard "Activité commerciale" block: target first.
  if (activity.coldCallTargetId && targetBl.has(activity.coldCallTargetId)) {
    return targetBl.get(activity.coldCallTargetId) ?? null
  }
  if (activity.opportunityId && opportunityBl.has(activity.opportunityId)) {
    return opportunityBl.get(activity.opportunityId) ?? null
  }
  return null
}

export function measureGoalMetric(
  metric: GoalMetric,
  businessLineId: string,
  window: DateRange,
  data: GoalData
): number {
  const confirmedEvents = () =>
    data.valueEvents.filter(
      (event) =>
        event.businessLineId === businessLineId &&
        (event.status === 'CONFIRMED' || event.status === 'PAID') &&
        inRange(event.eventDate, window)
    )

  if (metric === 'PAID_MEETINGS') {
    return confirmedEvents().filter((event) => event.eventType === 'PAID_MEETING').length
  }
  if (metric === 'SIGNATURES') {
    return confirmedEvents().filter((event) => SIGNATURE_EVENTS.includes(event.eventType)).length
  }
  if (metric === 'NEW_SUBSCRIPTIONS') {
    return confirmedEvents().filter((event) => event.eventType === 'SUBSCRIPTION_STARTED').length
  }
  if (metric === 'REVENUE') {
    return confirmedEvents()
      .filter((event) => event.revenueType !== 'MRR')
      .reduce((sum, event) => sum + (event.amount || 0), 0)
  }
  if (metric === 'NEW_MRR') {
    return confirmedEvents()
      .filter((event) => event.revenueType === 'MRR')
      .reduce((sum, event) => sum + (event.amount || 0), 0)
  }
  if (metric === 'OPPORTUNITIES') {
    return data.opportunities.filter(
      (opportunity) => opportunity.businessLineId === businessLineId && inRange(opportunity.createdAt, window)
    ).length
  }

  const opportunityBl = new Map(data.opportunities.map((opportunity) => [opportunity.id, opportunity.businessLineId]))
  const targetBl = new Map(data.coldCallTargets.map((target) => [target.id, target.businessLineId]))
  const activities = data.activities.filter(
    (activity) =>
      inRange(activity.date, window) &&
      activityBusinessLine(activity, opportunityBl, targetBl) === businessLineId
  )

  if (metric === 'CALLS') return activities.filter((activity) => activity.type === 'CALL').length
  if (metric === 'CONVERSATIONS') return activities.filter((activity) => activity.result === 'CONVERSATION').length
  // MEETINGS: a booked meeting (call result) or a meeting held, counted once per activity.
  return activities.filter((activity) => activity.result === 'MEETING_BOOKED' || activity.type === 'MEETING').length
}

export type GoalProgress =
  | {
      status: 'measured'
      goal: Goal
      metric: GoalMetric
      label: string
      unit: 'count' | 'currency'
      window: DateRange
      actual: number
      target: number
      ambitiousTarget: number | null
      percent: number
      // Share of the target expected by now if progress were linear (null once the window is over).
      expectedByNow: number | null
    }
  | { status: 'unknown_metric' | 'unknown_period'; goal: Goal; label: string }

export function buildGoalProgress(
  goals: Goal[],
  period: DateRange,
  data: GoalData,
  now: Date = new Date()
): GoalProgress[] {
  const rows: GoalProgress[] = []
  for (const goal of goals) {
    const window = goalWindow(goal, period.end)
    if (!window) {
      rows.push({ status: 'unknown_period', goal, label: goal.metric || 'Objectif' })
      continue
    }
    if (!overlaps(window, period)) continue

    const metric = normalizeGoalMetric(goal.metric)
    if (!metric) {
      rows.push({ status: 'unknown_metric', goal, label: goal.metric || 'Objectif' })
      continue
    }

    const actual = measureGoalMetric(metric, goal.businessLineId, window, data)
    const target = Number(goal.target) || 0
    const total = window.end.getTime() - window.start.getTime()
    const elapsed = Math.min(Math.max(now.getTime() - window.start.getTime(), 0), total)
    const expectedByNow = now > window.end || total <= 0 ? null : Math.round((target * elapsed) / total * 10) / 10

    rows.push({
      status: 'measured',
      goal,
      metric,
      label: GOAL_METRIC_LABELS[metric].label,
      unit: GOAL_METRIC_LABELS[metric].unit,
      window,
      actual,
      target,
      ambitiousTarget: goal.ambitiousTarget,
      percent: target > 0 ? Math.round((actual / target) * 100) : 0,
      expectedByNow,
    })
  }
  return rows
}
