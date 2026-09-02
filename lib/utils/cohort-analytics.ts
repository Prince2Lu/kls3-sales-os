// Cohort Conversion Analytics utilities (Phase 7B)
// Tracks true conversion of opportunities within 30-day observation window

import type {
  StageHistory,
  Stage,
  Opportunity,
  BusinessLine,
} from '@/types/domain'
import type { DateRange } from './period'
import { isInPeriod } from './period'
import {
  getNowInParis,
  getStartOfDayParis,
  getEndOfDayParis,
  getStartOfMonthParis,
  getEndOfMonthParis,
  addDaysParis,
  subtractMonthsParis,
} from './timezone'

// Cohort periods (for selecting cohort entry dates)
export type CohortPeriodType = 'thisMonth' | 'lastMonth' | 'last90days'

// Funnel stages for cohort analysis (same as Phase 7A)
export const COHORT_STAGES: Stage[] = [
  'Contacté',
  'Échange',
  'Qualifié',
  'RDV',
  'Opportunité',
  'Proposition',
  'Gagné',
]

export interface CohortEntry {
  opportunityId: string
  cohortEntryDate: Date // First entry into "Contacté"
  isMature: boolean // Now >= cohortEntryDate + 30 days
  businessLineId: string | null
}

export interface StageReachedMap {
  [opportunityId: string]: {
    [stage: string]: boolean // True if stage reached within 30-day window
  }
}

export interface ConversionFromContacted {
  stage: Stage
  reachedCount: number // Matures that reached this stage
  matureCount: number // Total matures in cohort
  conversionRate: number | null // reachedCount / matureCount (null if matureCount=0)
}

export interface StageToStageConversion {
  fromStage: Stage
  toStage: Stage
  fromCount: number // Matures that reached fromStage
  toCount: number // Matures that reached toStage
  conversionRate: number | null // toCount / fromCount (null if fromCount=0)
}

export interface CohortFrictionPoint {
  fromStage: Stage
  toStage: Stage
  fromCount: number
  toCount: number
  conversionRate: number
}

export interface CohortMetrics {
  cohortSize: number // Total opportunities in cohort
  matureCount: number // Opportunities with completed 30-day window
  inMaturationCount: number // Opportunities still in 30-day window
  conversionsFromContacted: ConversionFromContacted[]
  stageToStageConversions: StageToStageConversion[]
  frictionPoints: CohortFrictionPoint[]
}

export interface BusinessLineCohortMetrics {
  businessLineId: string
  businessLineName: string
  businessLineCode: string
  matureCount: number
  contacteToEchange: number | null
  contacteToRdv: number | null
  contacteToGagne: number | null
}

/**
 * Get cohort period date range in Europe/Paris timezone
 * CRITICAL: Explicit timezone handling for business rules
 */
export function getCohortPeriodRange(
  periodType: CohortPeriodType,
  now: Date = getNowInParis()
): DateRange {
  switch (periodType) {
    case 'thisMonth': {
      const start = getStartOfMonthParis(now)
      const end = getEndOfDayParis(now)
      return { start, end }
    }

    case 'lastMonth': {
      const lastMonth = subtractMonthsParis(now, 1)
      const start = getStartOfMonthParis(lastMonth)
      const end = getEndOfMonthParis(lastMonth)
      return { start, end }
    }

    case 'last90days': {
      const ninetyDaysAgo = addDaysParis(now, -90)
      const start = getStartOfDayParis(ninetyDaysAgo)
      const end = getEndOfDayParis(now)
      return { start, end }
    }

    default: {
      // Fallback to last month
      const lastMonth = subtractMonthsParis(now, 1)
      const start = getStartOfMonthParis(lastMonth)
      const end = getEndOfMonthParis(lastMonth)
      return { start, end }
    }
  }
}

/**
 * Get first "Contacté" entry date for an opportunity (cohort entry date)
 * Returns null if opportunity never entered "Contacté"
 */
export function getCohortEntryDate(
  opportunityId: string,
  stageHistory: StageHistory[]
): Date | null {
  const contacteEntries = stageHistory
    .filter(
      (entry) =>
        entry.opportunityId === opportunityId && entry.toStage === 'Contacté'
    )
    .sort(
      (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
    )

  return contacteEntries.length > 0
    ? new Date(contacteEntries[0].changedAt)
    : null
}

/**
 * Check if opportunity is mature (30-day observation window completed)
 * Uses Europe/Paris timezone for consistent DST handling
 */
export function isMature(cohortEntryDate: Date, now: Date = getNowInParis()): boolean {
  const thirtyDaysLater = addDaysParis(cohortEntryDate, 30)
  return now >= thirtyDaysLater
}

/**
 * Check if a stage was reached within 30-day window
 * Uses Europe/Paris timezone for consistent DST handling
 */
export function wasStageReachedWithinWindow(
  opportunityId: string,
  stage: Stage,
  cohortEntryDate: Date,
  stageHistory: StageHistory[]
): boolean {
  const windowEnd = addDaysParis(cohortEntryDate, 30)

  const stageEntries = stageHistory.filter(
    (entry) =>
      entry.opportunityId === opportunityId &&
      entry.toStage === stage &&
      new Date(entry.changedAt) >= cohortEntryDate &&
      new Date(entry.changedAt) <= windowEnd
  )

  return stageEntries.length > 0
}

/**
 * Get the timestamp when a stage was first reached within 30-day window
 * Returns null if stage was never reached within window
 */
export function getStageReachedTimestamp(
  opportunityId: string,
  stage: Stage,
  cohortEntryDate: Date,
  stageHistory: StageHistory[]
): Date | null {
  const windowEnd = addDaysParis(cohortEntryDate, 30)

  const stageEntries = stageHistory
    .filter(
      (entry) =>
        entry.opportunityId === opportunityId &&
        entry.toStage === stage &&
        new Date(entry.changedAt) >= cohortEntryDate &&
        new Date(entry.changedAt) <= windowEnd
    )
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())

  return stageEntries.length > 0 ? new Date(stageEntries[0].changedAt) : null
}

/**
 * Check if an opportunity successfully transitioned from fromStage to toStage
 * CRITICAL: Verifies temporal order - toStage must be reached AFTER fromStage
 * Handles multiple occurrences: if Qualifié J3, Échange J7, Qualifié J10 exists,
 * then Échange→Qualifié is valid (Qualifié J10 after Échange J7)
 */
export function hasValidTransition(
  opportunityId: string,
  fromStage: Stage,
  toStage: Stage,
  cohortEntryDate: Date,
  stageHistory: StageHistory[]
): boolean {
  const windowEnd = addDaysParis(cohortEntryDate, 30)

  // Get first occurrence of fromStage in window
  const fromTimestamp = getStageReachedTimestamp(
    opportunityId,
    fromStage,
    cohortEntryDate,
    stageHistory
  )

  if (!fromTimestamp) return false

  // Get ALL occurrences of toStage in window
  const toStageEntries = stageHistory
    .filter(
      (entry) =>
        entry.opportunityId === opportunityId &&
        entry.toStage === toStage &&
        new Date(entry.changedAt) >= cohortEntryDate &&
        new Date(entry.changedAt) <= windowEnd
    )
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())

  // Check if ANY occurrence of toStage happened AFTER fromStage
  return toStageEntries.some(
    (entry) => new Date(entry.changedAt) > fromTimestamp
  )
}

/**
 * Build cohort from opportunities that entered "Contacté" during period
 * Uses Europe/Paris timezone for consistent period boundaries
 */
export function buildCohort(
  stageHistory: StageHistory[],
  opportunities: Opportunity[],
  cohortPeriod: DateRange,
  now: Date = getNowInParis()
): CohortEntry[] {
  const cohortEntries: CohortEntry[] = []
  const opportunityMap = new Map(opportunities.map((o) => [o.id, o]))

  // Get all unique opportunity IDs from stage history
  const opportunityIds = new Set(stageHistory.map((entry) => entry.opportunityId))

  opportunityIds.forEach((oppId) => {
    const cohortEntryDate = getCohortEntryDate(oppId, stageHistory)

    // Only include if they entered Contacté during the cohort period
    if (cohortEntryDate && isInPeriod(cohortEntryDate.toISOString(), cohortPeriod)) {
      const opportunity = opportunityMap.get(oppId)
      const businessLineId = opportunity?.businessLineId || null

      cohortEntries.push({
        opportunityId: oppId,
        cohortEntryDate,
        isMature: isMature(cohortEntryDate, now),
        businessLineId,
      })
    }
  })

  return cohortEntries
}

/**
 * Build map of stages reached within window for mature cohort members
 */
export function buildStageReachedMap(
  cohortEntries: CohortEntry[],
  stageHistory: StageHistory[]
): StageReachedMap {
  const map: StageReachedMap = {}

  cohortEntries.forEach((entry) => {
    if (!entry.isMature) return // Only process matures

    map[entry.opportunityId] = {}

    COHORT_STAGES.forEach((stage) => {
      map[entry.opportunityId][stage] = wasStageReachedWithinWindow(
        entry.opportunityId,
        stage,
        entry.cohortEntryDate,
        stageHistory
      )
    })
  })

  return map
}

/**
 * Calculate conversion from Contacté for each stage
 */
export function calculateConversionsFromContacted(
  cohortEntries: CohortEntry[],
  stageReachedMap: StageReachedMap
): ConversionFromContacted[] {
  const matures = cohortEntries.filter((e) => e.isMature)
  const matureCount = matures.length

  return COHORT_STAGES.map((stage) => {
    const reachedCount = matures.filter(
      (entry) => stageReachedMap[entry.opportunityId]?.[stage]
    ).length

    const conversionRate =
      matureCount > 0 ? Math.round((reachedCount / matureCount) * 100) : null

    return {
      stage,
      reachedCount,
      matureCount,
      conversionRate,
    }
  })
}

/**
 * Calculate stage-to-stage conversion rates
 * CRITICAL RULES:
 * 1. Uses intersection of IDs - only counts opportunities that reached BOTH stages
 * 2. Verifies temporal order - toStage must be reached AFTER fromStage
 * 3. Handles multiple stage occurrences (e.g., Qualifié J3, Échange J7, Qualifié J10 = valid)
 * 4. Both stages must be within 30-day observation window
 */
export function calculateStageToStageConversions(
  cohortEntries: CohortEntry[],
  stageReachedMap: StageReachedMap,
  stageHistory: StageHistory[]
): StageToStageConversion[] {
  const matures = cohortEntries.filter((e) => e.isMature)
  const conversions: StageToStageConversion[] = []

  for (let i = 0; i < COHORT_STAGES.length - 1; i++) {
    const fromStage = COHORT_STAGES[i]
    const toStage = COHORT_STAGES[i + 1]

    // Get opportunities that reached fromStage
    const reachedFrom = matures.filter(
      (entry) => stageReachedMap[entry.opportunityId]?.[fromStage]
    )

    const fromCount = reachedFrom.length

    // CRITICAL: Among those that reached fromStage,
    // count how many ALSO reached toStage AFTER fromStage (temporal order)
    const toCount = reachedFrom.filter((entry) =>
      hasValidTransition(
        entry.opportunityId,
        fromStage,
        toStage,
        entry.cohortEntryDate,
        stageHistory
      )
    ).length

    const conversionRate =
      fromCount > 0 ? Math.round((toCount / fromCount) * 100) : null

    conversions.push({
      fromStage,
      toStage,
      fromCount,
      toCount,
      conversionRate,
    })
  }

  return conversions
}

/**
 * Detect friction points (lowest stage-to-stage conversions with min threshold)
 */
export function detectCohortFrictionPoints(
  conversions: StageToStageConversion[],
  minThreshold: number = 5
): CohortFrictionPoint[] {
  const eligible = conversions.filter(
    (c) => c.fromCount >= minThreshold && c.conversionRate !== null
  )

  const sorted = eligible
    .map((c) => ({
      fromStage: c.fromStage,
      toStage: c.toStage,
      fromCount: c.fromCount,
      toCount: c.toCount,
      conversionRate: c.conversionRate as number,
    }))
    .sort((a, b) => a.conversionRate - b.conversionRate)

  return sorted.slice(0, 3)
}

/**
 * Compare Business Lines on cohort metrics
 */
export function compareBusinessLinesCohort(
  cohortEntries: CohortEntry[],
  stageReachedMap: StageReachedMap,
  businessLines: BusinessLine[]
): BusinessLineCohortMetrics[] {
  return businessLines.map((bl) => {
    const blMatures = cohortEntries.filter(
      (entry) => entry.isMature && entry.businessLineId === bl.id
    )

    const matureCount = blMatures.length

    const echangeCount = blMatures.filter(
      (entry) => stageReachedMap[entry.opportunityId]?.['Échange']
    ).length

    const rdvCount = blMatures.filter(
      (entry) => stageReachedMap[entry.opportunityId]?.['RDV']
    ).length

    const gagneCount = blMatures.filter(
      (entry) => stageReachedMap[entry.opportunityId]?.['Gagné']
    ).length

    return {
      businessLineId: bl.id,
      businessLineName: bl.name,
      businessLineCode: bl.code,
      matureCount,
      contacteToEchange:
        matureCount > 0 ? Math.round((echangeCount / matureCount) * 100) : null,
      contacteToRdv:
        matureCount > 0 ? Math.round((rdvCount / matureCount) * 100) : null,
      contacteToGagne:
        matureCount > 0 ? Math.round((gagneCount / matureCount) * 100) : null,
    }
  })
}

/**
 * Count data quality issues (opportunities that reached RDV without Contacté)
 */
export function countDataQualityIssues(
  opportunities: Opportunity[],
  stageHistory: StageHistory[],
  businessLineId: string | null = null
): number {
  let count = 0

  opportunities.forEach((opp) => {
    // Apply BL filter if specified
    if (businessLineId && opp.businessLineId !== businessLineId) {
      return
    }

    // Check if opportunity reached RDV
    const reachedRdv = stageHistory.some(
      (entry) => entry.opportunityId === opp.id && entry.toStage === 'RDV'
    )

    // Check if opportunity ever entered Contacté
    const hasContacte = stageHistory.some(
      (entry) => entry.opportunityId === opp.id && entry.toStage === 'Contacté'
    )

    if (reachedRdv && !hasContacte) {
      count++
    }
  })

  return count
}

/**
 * Format cohort period label for display
 */
export function formatCohortPeriodLabel(periodType: CohortPeriodType): string {
  switch (periodType) {
    case 'thisMonth':
      return 'Ce mois'
    case 'lastMonth':
      return 'Mois dernier'
    case 'last90days':
      return '90 derniers jours'
    default:
      return 'Mois dernier'
  }
}
