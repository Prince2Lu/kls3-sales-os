// Business Line Efficiency Analytics (Phase 7D)
// Measures commercial effort vs economic outcomes

import type { Activity, ValueEvent, Opportunity, BusinessLine, ActivityType } from '@/types/domain'
import type { DateRange } from './period'
import { isInPeriod } from './period'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Activity types counted as commercial effort for Efficiency metrics
 *
 * INCLUDED:
 * - CALL: Phone calls
 * - EMAIL: Email outreach
 * - LINKEDIN: LinkedIn messages/interactions
 * - MEETING: Meetings (face-to-face or virtual)
 * - DEMO: Product demonstrations
 * - PROPOSAL: Proposal/quote submissions
 *
 * EXCLUDED:
 * - NOTE: Internal notes (may duplicate other activities)
 * - OTHER: Too ambiguous for efficiency metrics
 */
const COMMERCIAL_ACTIVITY_TYPES: ActivityType[] = [
  'CALL',
  'EMAIL',
  'LINKEDIN',
  'MEETING',
  'DEMO',
  'PROPOSAL',
]

// ============================================================================
// TYPES
// ============================================================================

export interface EfficiencyMetrics {
  // Core metrics
  actions: number // Commercial activities realized
  outcomes: number // Economic events (VALUE_EVENTS with CONFIRMED/PAID)
  oneTimeRevenue: number // ONE_SHOT + PROJECT revenue
  mrr: number // MRR revenue

  // Ratios
  valuePerAction: number | null // oneTimeRevenue / actions (for non-MRR BLs)
  mrrPerAction: number | null // mrr / actions (for CALYMIA)
  actionsPerOutcome: number | null // actions / outcomes
}

export interface BusinessLineEfficiency {
  businessLineId: string
  businessLineName: string
  businessLineCode: string
  revenueType: string
  metrics: EfficiencyMetrics
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Filter activities by period and commercial type
 * Only includes activity types defined in COMMERCIAL_ACTIVITY_TYPES
 */
function filterActivitiesByPeriod(
  activities: Activity[],
  period: DateRange
): Activity[] {
  return activities.filter(
    (activity) =>
      isInPeriod(activity.date, period) &&
      COMMERCIAL_ACTIVITY_TYPES.includes(activity.type)
  )
}

/**
 * Filter value events by period and status (CONFIRMED or PAID only)
 *
 * IMPORTANT: No deduplication needed.
 * Each VALUE_EVENT is a unique Airtable record with a unique ID.
 * The Status field evolves on the same record (PENDING → CONFIRMED → PAID).
 * We simply filter to include only CONFIRMED or PAID status.
 */
function filterValueEventsByPeriod(
  valueEvents: ValueEvent[],
  period: DateRange
): ValueEvent[] {
  return valueEvents.filter((event) => {
    // Only include CONFIRMED or PAID status
    if (event.status !== 'CONFIRMED' && event.status !== 'PAID') {
      return false
    }

    // Check if event date is in period
    return isInPeriod(event.eventDate, period)
  })
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Calculate efficiency metrics for a specific Business Line
 */
function calculateBusinessLineEfficiency(
  activities: Activity[],
  valueEvents: ValueEvent[],
  opportunities: Opportunity[],
  businessLineId: string,
  period: DateRange
): EfficiencyMetrics {
  // Filter activities by period first
  const periodActivities = filterActivitiesByPeriod(activities, period)

  // Filter value events by period and status
  const periodValueEvents = filterValueEventsByPeriod(valueEvents, period)

  // Find activities linked to this Business Line
  // activity → opportunityId → opportunity.businessLineId
  const opportunityMap = new Map(opportunities.map((o) => [o.id, o]))

  const blActivities = periodActivities.filter((activity) => {
    if (!activity.opportunityId) return false
    const opp = opportunityMap.get(activity.opportunityId)
    return opp?.businessLineId === businessLineId
  })

  // Find value events for this Business Line
  const blValueEvents = periodValueEvents.filter(
    (event) => event.businessLineId === businessLineId
  )

  // Count actions (all activities)
  const actions = blActivities.length

  // Count outcomes (all VALUE_EVENTS)
  const outcomes = blValueEvents.length

  // Calculate revenue
  let oneTimeRevenue = 0
  let mrr = 0

  for (const event of blValueEvents) {
    if (event.revenueType === 'ONE_SHOT' || event.revenueType === 'PROJECT') {
      oneTimeRevenue += event.amount
    } else if (event.revenueType === 'MRR') {
      mrr += event.amount
    }
  }

  // Calculate ratios
  // valuePerAction: 0 if actions > 0 but value = 0, null if actions = 0
  const valuePerAction = actions > 0 ? oneTimeRevenue / actions : null
  const mrrPerAction = actions > 0 ? mrr / actions : null
  const actionsPerOutcome = outcomes > 0 ? actions / outcomes : null

  return {
    actions,
    outcomes,
    oneTimeRevenue,
    mrr,
    valuePerAction,
    mrrPerAction,
    actionsPerOutcome,
  }
}

/**
 * Calculate global efficiency metrics (all Business Lines aggregated)
 */
function calculateGlobalEfficiency(
  activities: Activity[],
  valueEvents: ValueEvent[],
  period: DateRange
): EfficiencyMetrics {
  // Filter activities by period
  const periodActivities = filterActivitiesByPeriod(activities, period)

  // Filter value events by period and status
  const periodValueEvents = filterValueEventsByPeriod(valueEvents, period)

  // Count all actions
  const actions = periodActivities.length

  // Count all outcomes
  const outcomes = periodValueEvents.length

  // Calculate revenue (separate ONE_TIME and MRR)
  let oneTimeRevenue = 0
  let mrr = 0

  for (const event of periodValueEvents) {
    if (event.revenueType === 'ONE_SHOT' || event.revenueType === 'PROJECT') {
      oneTimeRevenue += event.amount
    } else if (event.revenueType === 'MRR') {
      mrr += event.amount
    }
  }

  // Ratios for global view (no valuePerAction since we mix ONE_TIME and MRR)
  const valuePerAction = null // Not meaningful to mix ONE_TIME and MRR
  const mrrPerAction = null // Not meaningful in global view
  const actionsPerOutcome = outcomes > 0 ? actions / outcomes : null

  return {
    actions,
    outcomes,
    oneTimeRevenue,
    mrr,
    valuePerAction,
    mrrPerAction,
    actionsPerOutcome,
  }
}

/**
 * Calculate efficiency for all Business Lines
 */
export function calculateAllBusinessLineEfficiency(
  activities: Activity[],
  valueEvents: ValueEvent[],
  opportunities: Opportunity[],
  businessLines: BusinessLine[],
  period: DateRange
): BusinessLineEfficiency[] {
  return businessLines.map((bl) => ({
    businessLineId: bl.id,
    businessLineName: bl.name,
    businessLineCode: bl.code,
    revenueType: bl.revenueType,
    metrics: calculateBusinessLineEfficiency(
      activities,
      valueEvents,
      opportunities,
      bl.id,
      period
    ),
  }))
}

/**
 * Calculate efficiency for a single Business Line
 */
export function calculateSingleBusinessLineEfficiency(
  activities: Activity[],
  valueEvents: ValueEvent[],
  opportunities: Opportunity[],
  businessLineId: string,
  period: DateRange
): EfficiencyMetrics {
  return calculateBusinessLineEfficiency(
    activities,
    valueEvents,
    opportunities,
    businessLineId,
    period
  )
}

/**
 * Calculate global efficiency (all Business Lines)
 */
export function calculateGlobalEfficiencyMetrics(
  activities: Activity[],
  valueEvents: ValueEvent[],
  period: DateRange
): EfficiencyMetrics {
  return calculateGlobalEfficiency(activities, valueEvents, period)
}
