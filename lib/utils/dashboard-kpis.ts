// Dashboard KPI calculation utilities
// Centralizes KPI logic for consistency and maintainability

import type {
  ValueEvent,
  Opportunity,
  Activity,
  BusinessLine,
  Task,
  ActivityResult,
} from '@/types/domain'
import type { DateRange } from './period'
import { isInPeriod } from './period'

// ============================================================================
// REVENUE CALCULATIONS (from Value Events only)
// ============================================================================

/**
 * Calculate confirmed revenue from Value Events
 * Only counts CONFIRMED and PAID statuses
 */
export function calculateConfirmedRevenue(
  valueEvents: ValueEvent[],
  businessLineIds?: string[]
): number {
  return valueEvents
    .filter((ve) => {
      // Only confirmed or paid events count as real revenue
      if (ve.status !== 'CONFIRMED' && ve.status !== 'PAID') return false

      // Filter by business line if specified
      if (businessLineIds && !businessLineIds.includes(ve.businessLineId)) return false

      // Exclude MRR from one-shot revenue calculations
      if (ve.revenueType === 'MRR') return false

      return true
    })
    .reduce((sum, ve) => sum + (ve.amount || 0), 0)
}

/**
 * Calculate MRR from Value Events
 * Only counts CONFIRMED and PAID MRR events
 */
export function calculateMRR(valueEvents: ValueEvent[]): number {
  return valueEvents
    .filter((ve) => {
      if (ve.status !== 'CONFIRMED' && ve.status !== 'PAID') return false
      if (ve.revenueType !== 'MRR') return false
      return true
    })
    .reduce((sum, ve) => sum + (ve.amount || 0), 0)
}

/**
 * Calculate Partner Revenue (Paul + Sacha)
 */
export function calculatePartnerRevenue(
  valueEvents: ValueEvent[],
  businessLines: BusinessLine[]
): number {
  const partnerIds = businessLines
    .filter((bl) => bl.category === 'PARTNER')
    .map((bl) => bl.id)

  return calculateConfirmedRevenue(valueEvents, partnerIds)
}

/**
 * Calculate Owned Revenue (KLS3 owned business lines, excluding MRR)
 */
export function calculateOwnedRevenue(
  valueEvents: ValueEvent[],
  businessLines: BusinessLine[]
): number {
  const ownedIds = businessLines
    .filter((bl) => bl.category === 'OWNED')
    .map((bl) => bl.id)

  return calculateConfirmedRevenue(valueEvents, ownedIds)
}

// ============================================================================
// PIPELINE CALCULATIONS
// ============================================================================

/**
 * Calculate pipeline value
 * Sum of potential value for all open opportunities (excluding Gagné and Perdu)
 */
export function calculatePipeline(
  opportunities: Opportunity[],
  businessLineId?: string
): number {
  return opportunities
    .filter((opp) => {
      // Exclude closed opportunities
      if (opp.stage === 'Gagné' || opp.stage === 'Perdu') return false

      // Filter by business line if specified
      if (businessLineId && opp.businessLineId !== businessLineId) return false

      return true
    })
    .reduce((sum, opp) => sum + (opp.potentialValue || 0), 0)
}

/**
 * Get pipeline breakdown by stage
 */
export function getPipelineByStage(
  opportunities: Opportunity[],
  businessLineId?: string
): Array<{ stage: string; count: number; value: number }> {
  const activeStages = [
    'À prospecter',
    'Contacté',
    'Échange',
    'Qualifié',
    'RDV',
    'Opportunité',
    'Proposition',
  ]

  const activeOpps = opportunities.filter((opp) => {
    if (opp.stage === 'Gagné' || opp.stage === 'Perdu') return false
    if (businessLineId && opp.businessLineId !== businessLineId) return false
    return true
  })

  return activeStages.map((stage) => {
    const stageOpps = activeOpps.filter((opp) => opp.stage === stage)
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, opp) => sum + (opp.potentialValue || 0), 0),
    }
  })
}

// ============================================================================
// ACTIVITY KPIs
// ============================================================================

/**
 * Count calls in period
 */
export function countCalls(
  activities: Activity[],
  period: DateRange,
  businessLineId?: string,
  opportunities?: Opportunity[]
): number {
  return activities.filter((activity) => {
    if (activity.type !== 'CALL') return false
    if (!isInPeriod(activity.date, period)) return false

    if (businessLineId && activity.opportunityId && opportunities) {
      const opp = opportunities.find((o) => o.id === activity.opportunityId)
      if (!opp || opp.businessLineId !== businessLineId) return false
    }

    return true
  }).length
}

/**
 * Count conversations in period
 */
export function countConversations(
  activities: Activity[],
  period: DateRange,
  businessLineId?: string,
  opportunities?: Opportunity[]
): number {
  return activities.filter((activity) => {
    if (activity.result !== 'CONVERSATION') return false
    if (!isInPeriod(activity.date, period)) return false

    if (businessLineId && activity.opportunityId && opportunities) {
      const opp = opportunities.find((o) => o.id === activity.opportunityId)
      if (!opp || opp.businessLineId !== businessLineId) return false
    }

    return true
  }).length
}

/**
 * Count meetings in period
 */
export function countMeetings(
  activities: Activity[],
  period: DateRange,
  businessLineId?: string,
  opportunities?: Opportunity[]
): number {
  return activities.filter((activity) => {
    const isMeeting =
      activity.type === 'MEETING' || activity.result === 'MEETING_BOOKED'
    if (!isMeeting) return false
    if (!isInPeriod(activity.date, period)) return false

    if (businessLineId && activity.opportunityId && opportunities) {
      const opp = opportunities.find((o) => o.id === activity.opportunityId)
      if (!opp || opp.businessLineId !== businessLineId) return false
    }

    return true
  }).length
}

/**
 * Count opportunities created in period
 */
export function countOpportunitiesCreated(
  opportunities: Opportunity[],
  period: DateRange,
  businessLineId?: string
): number {
  return opportunities.filter((opp) => {
    if (!isInPeriod(opp.createdAt, period)) return false
    if (businessLineId && opp.businessLineId !== businessLineId) return false
    return true
  }).length
}

/**
 * Count current proposals
 */
export function countProposals(
  opportunities: Opportunity[],
  businessLineId?: string
): number {
  return opportunities.filter((opp) => {
    if (opp.stage !== 'Proposition') return false
    if (businessLineId && opp.businessLineId !== businessLineId) return false
    return true
  }).length
}

/**
 * Count wins (current Gagné stage)
 * CURRENT STATE - not period-filtered
 */
export function countWins(
  opportunities: Opportunity[],
  businessLineId?: string
): number {
  return opportunities.filter((opp) => {
    if (opp.stage !== 'Gagné') return false
    if (businessLineId && opp.businessLineId !== businessLineId) return false
    return true
  }).length
}

/**
 * Count wins in period (using Won At timestamp)
 * PERIOD FLOW - period-filtered
 */
export function countWinsInPeriod(
  opportunities: Opportunity[],
  period: DateRange,
  businessLineId?: string
): number {
  return opportunities.filter((opp) => {
    if (!opp.wonAt) return false
    if (!isInPeriod(opp.wonAt, period)) return false
    if (businessLineId && opp.businessLineId !== businessLineId) return false
    return true
  }).length
}

// ============================================================================
// ATTENTION / ACTION KPIs
// ============================================================================

/**
 * Count overdue tasks
 */
export function countOverdueTasks(
  tasks: Task[],
  businessLineId?: string,
  opportunities?: Opportunity[]
): number {
  const now = new Date()

  return tasks.filter((task) => {
    if (task.status !== 'TODO') return false
    if (!task.dueAt) return false

    const dueDate = new Date(task.dueAt)
    if (dueDate >= now) return false

    if (businessLineId && task.opportunityId && opportunities) {
      const opp = opportunities.find((o) => o.id === task.opportunityId)
      if (!opp || opp.businessLineId !== businessLineId) return false
    }

    return true
  }).length
}

/**
 * Find opportunities without next action (no TODO tasks)
 */
export function findOpportunitiesWithoutNextAction(
  opportunities: Opportunity[],
  tasks: Task[],
  businessLineId?: string
): Opportunity[] {
  const activeOpps = opportunities.filter((opp) => {
    if (opp.stage === 'Gagné' || opp.stage === 'Perdu') return false
    if (businessLineId && opp.businessLineId !== businessLineId) return false
    return true
  })

  const todoTasks = tasks.filter((t) => t.status === 'TODO')
  const oppsWithTasks = new Set(
    todoTasks.map((t) => t.opportunityId).filter(Boolean)
  )

  return activeOpps.filter((opp) => !oppsWithTasks.has(opp.id))
}

/**
 * Count proposals needing follow-up (Proposition stage without recent activity)
 */
export function countProposalsNeedingFollowup(
  opportunities: Opportunity[],
  tasks: Task[],
  businessLineId?: string
): number {
  const proposals = opportunities.filter((opp) => {
    if (opp.stage !== 'Proposition') return false
    if (businessLineId && opp.businessLineId !== businessLineId) return false
    return true
  })

  const todoTasks = tasks.filter((t) => t.status === 'TODO')
  const oppsWithTasks = new Set(
    todoTasks.map((t) => t.opportunityId).filter(Boolean)
  )

  return proposals.filter((opp) => !oppsWithTasks.has(opp.id)).length
}
