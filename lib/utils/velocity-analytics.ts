// Sales Velocity Analytics utilities for Phase 7C
// Measures time-to-transition for opportunities based on STAGE_HISTORY
// Uses median as primary metric (outlier-resistant)

import type {
  StageHistory,
  Stage,
  Opportunity,
  BusinessLine,
} from '@/types/domain'
import type { DateRange } from './period'
import { isInPeriod } from './period'

// Velocity transitions to measure (Phase 7C V1)
export const VELOCITY_TRANSITIONS = [
  { from: 'Contacté', to: 'RDV' },
  { from: 'RDV', to: 'Proposition' },
  { from: 'Proposition', to: 'Gagné' },
  { from: 'Contacté', to: 'Gagné' },
] as const

export type VelocityTransition = typeof VELOCITY_TRANSITIONS[number]

export interface TransitionDuration {
  opportunityId: string
  fromStage: Stage
  toStage: Stage
  fromDate: Date
  toDate: Date
  durationDays: number
}

export interface TransitionMetrics {
  fromStage: Stage
  toStage: Stage
  medianDays: number | null
  averageDays: number | null
  minDays: number | null
  maxDays: number | null
  sampleSize: number
  durations: TransitionDuration[]
}

export interface BusinessLineVelocityMetrics {
  businessLineId: string
  businessLineName: string
  businessLineCode: string
  contacteToRdv: number | null
  rdvToProposition: number | null
  propositionToGagne: number | null
  contacteToGagne: number | null
  sampleSizes: {
    contacteToRdv: number
    rdvToProposition: number
    propositionToGagne: number
    contacteToGagne: number
  }
}

/**
 * Get first occurrence of a stage for an opportunity in STAGE_HISTORY
 * Returns null if stage never reached
 */
function getFirstStageOccurrence(
  opportunityId: string,
  stage: Stage,
  stageHistory: StageHistory[]
): Date | null {
  const entries = stageHistory
    .filter(
      (entry) =>
        entry.opportunityId === opportunityId && entry.toStage === stage
    )
    .sort(
      (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
    )

  return entries.length > 0 ? new Date(entries[0].changedAt) : null
}

/**
 * Get first occurrence of fromStage within period for an opportunity
 * This is the entry point for velocity measurement
 */
function getFromStageInPeriod(
  opportunityId: string,
  fromStage: Stage,
  stageHistory: StageHistory[],
  period: DateRange
): Date | null {
  const entries = stageHistory
    .filter(
      (entry) =>
        entry.opportunityId === opportunityId &&
        entry.toStage === fromStage &&
        isInPeriod(entry.changedAt, period)
    )
    .sort(
      (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
    )

  return entries.length > 0 ? new Date(entries[0].changedAt) : null
}

/**
 * Get first occurrence of toStage AFTER a specific fromDate
 * Handles temporal ordering and multiple occurrences
 *
 * CRITICAL RULES:
 * - toStage must occur AFTER fromDate
 * - Returns first valid occurrence after fromDate
 * - No window truncation (can be days, weeks, or months after fromDate)
 *
 * Example:
 * Proposition J6, RDV J10, Proposition J15 with fromDate=J10
 * => Returns Proposition J15 (first after RDV J10)
 */
function getToStageAfterFrom(
  opportunityId: string,
  toStage: Stage,
  fromDate: Date,
  stageHistory: StageHistory[]
): Date | null {
  const entries = stageHistory
    .filter(
      (entry) =>
        entry.opportunityId === opportunityId &&
        entry.toStage === toStage &&
        new Date(entry.changedAt) > fromDate // Strictly AFTER fromDate
    )
    .sort(
      (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
    )

  return entries.length > 0 ? new Date(entries[0].changedAt) : null
}

/**
 * Calculate duration in days between two dates
 * Returns decimal days (e.g., 5.3 days)
 */
function calculateDurationDays(fromDate: Date, toDate: Date): number {
  const durationMs = toDate.getTime() - fromDate.getTime()
  const durationDays = durationMs / (1000 * 60 * 60 * 24)
  return Math.round(durationDays * 10) / 10 // Round to 1 decimal
}

/**
 * Calculate median of an array of numbers
 * Returns null if array is empty
 */
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    // Even length: average of two middle values
    const median = (sorted[mid - 1] + sorted[mid]) / 2
    return Math.round(median * 10) / 10 // Round to 1 decimal
  } else {
    // Odd length: middle value
    return sorted[mid]
  }
}

/**
 * Calculate average of an array of numbers
 * Returns null if array is empty
 */
function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null

  const sum = values.reduce((acc, val) => acc + val, 0)
  const avg = sum / values.length
  return Math.round(avg * 10) / 10 // Round to 1 decimal
}

/**
 * Calculate transition durations for opportunities in period
 *
 * CRITICAL RULES:
 * 1. Period selects fromStage occurrences (entry point)
 * 2. Each opportunity counted ONCE per transition per period (first fromStage in period)
 * 3. toStage observation is NOT truncated by period end
 * 4. toStage must occur AFTER fromStage (temporal ordering)
 * 5. No backfilling - both stages must exist in STAGE_HISTORY
 *
 * Example workflow:
 * - Find all opportunities with Contacté in August
 * - For each, find first RDV AFTER that Contacté (even if in September)
 * - Calculate duration
 */
export function calculateTransitionDurations(
  fromStage: Stage,
  toStage: Stage,
  stageHistory: StageHistory[],
  opportunities: Opportunity[],
  period: DateRange,
  businessLineId: string | null = null
): TransitionDuration[] {
  const durations: TransitionDuration[] = []

  // Filter opportunities by Business Line if specified
  const filteredOpportunities = businessLineId
    ? opportunities.filter((opp) => opp.businessLineId === businessLineId)
    : opportunities

  // Get unique opportunity IDs from filtered set
  const opportunityIds = new Set(filteredOpportunities.map((opp) => opp.id))

  // Process each opportunity
  opportunityIds.forEach((oppId) => {
    // Find first fromStage occurrence in period
    const fromDate = getFromStageInPeriod(oppId, fromStage, stageHistory, period)

    if (!fromDate) return // Opportunity didn't reach fromStage in period

    // Find first toStage occurrence AFTER fromDate (no period truncation)
    const toDate = getToStageAfterFrom(oppId, toStage, fromDate, stageHistory)

    if (!toDate) return // Opportunity didn't reach toStage after fromStage

    // Calculate duration
    const durationDays = calculateDurationDays(fromDate, toDate)

    durations.push({
      opportunityId: oppId,
      fromStage,
      toStage,
      fromDate,
      toDate,
      durationDays,
    })
  })

  return durations
}

/**
 * Calculate metrics for a specific transition
 */
export function calculateTransitionMetrics(
  fromStage: Stage,
  toStage: Stage,
  stageHistory: StageHistory[],
  opportunities: Opportunity[],
  period: DateRange,
  businessLineId: string | null = null
): TransitionMetrics {
  const durations = calculateTransitionDurations(
    fromStage,
    toStage,
    stageHistory,
    opportunities,
    period,
    businessLineId
  )

  const durationValues = durations.map((d) => d.durationDays)

  return {
    fromStage,
    toStage,
    medianDays: calculateMedian(durationValues),
    averageDays: calculateAverage(durationValues),
    minDays: durationValues.length > 0 ? Math.min(...durationValues) : null,
    maxDays: durationValues.length > 0 ? Math.max(...durationValues) : null,
    sampleSize: durations.length,
    durations,
  }
}

/**
 * Calculate all velocity metrics for the period
 */
export function calculateAllVelocityMetrics(
  stageHistory: StageHistory[],
  opportunities: Opportunity[],
  period: DateRange,
  businessLineId: string | null = null
): TransitionMetrics[] {
  return VELOCITY_TRANSITIONS.map((transition) =>
    calculateTransitionMetrics(
      transition.from,
      transition.to,
      stageHistory,
      opportunities,
      period,
      businessLineId
    )
  )
}

/**
 * Compare Business Lines on velocity metrics
 * Only shown when "Toutes" is selected (no BL filter)
 */
export function compareBusinessLinesVelocity(
  stageHistory: StageHistory[],
  opportunities: Opportunity[],
  businessLines: BusinessLine[],
  period: DateRange
): BusinessLineVelocityMetrics[] {
  return businessLines.map((bl) => {
    const metrics = calculateAllVelocityMetrics(
      stageHistory,
      opportunities,
      period,
      bl.id
    )

    // Extract medians for each key transition
    const contacteToRdv = metrics.find(
      (m) => m.fromStage === 'Contacté' && m.toStage === 'RDV'
    )
    const rdvToProposition = metrics.find(
      (m) => m.fromStage === 'RDV' && m.toStage === 'Proposition'
    )
    const propositionToGagne = metrics.find(
      (m) => m.fromStage === 'Proposition' && m.toStage === 'Gagné'
    )
    const contacteToGagne = metrics.find(
      (m) => m.fromStage === 'Contacté' && m.toStage === 'Gagné'
    )

    return {
      businessLineId: bl.id,
      businessLineName: bl.name,
      businessLineCode: bl.code,
      contacteToRdv: contacteToRdv?.medianDays || null,
      rdvToProposition: rdvToProposition?.medianDays || null,
      propositionToGagne: propositionToGagne?.medianDays || null,
      contacteToGagne: contacteToGagne?.medianDays || null,
      sampleSizes: {
        contacteToRdv: contacteToRdv?.sampleSize || 0,
        rdvToProposition: rdvToProposition?.sampleSize || 0,
        propositionToGagne: propositionToGagne?.sampleSize || 0,
        contacteToGagne: contacteToGagne?.sampleSize || 0,
      },
    }
  })
}

/**
 * Format duration for display
 */
export function formatDuration(days: number | null): string {
  if (days === null) return '—'

  // Integer days (e.g., 5)
  if (days === Math.floor(days)) {
    return `${days} j`
  }

  // Decimal days (e.g., 5.3)
  return `${days.toFixed(1)} j`
}
