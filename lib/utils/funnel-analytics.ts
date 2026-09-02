// Funnel Analytics utilities for Phase 7A
// Pure functions for STAGE_HISTORY analysis
// Uses STAGE_HISTORY as single source of truth (no backfilling)

import type {
  StageHistory,
  Stage,
  Opportunity,
  BusinessLine,
} from '@/types/domain'
import type { DateRange } from './period'
import { isInPeriod } from './period'

// Funnel stages in display order (excludes "À prospecter" and "Perdu")
export const FUNNEL_STAGES: Stage[] = [
  'Contacté',
  'Échange',
  'Qualifié',
  'RDV',
  'Opportunité',
  'Proposition',
  'Gagné',
]

export interface StageVolume {
  stage: Stage
  count: number
  opportunityIds: string[]
}

export interface BusinessLineAnalytics {
  businessLineId: string
  businessLineName: string
  businessLineCode: string
  contactes: number // Contacté count
  echanges: number // Échange count
  rdv: number // RDV count
  propositions: number // Proposition count
  gagnes: number // Gagné count
}

/**
 * Filter STAGE_HISTORY entries by period (changedAt within range)
 */
export function filterStageHistoryByPeriod(
  history: StageHistory[],
  period: DateRange
): StageHistory[] {
  return history.filter((entry) => isInPeriod(entry.changedAt, period))
}

/**
 * Filter STAGE_HISTORY entries by Business Line
 * Requires opportunity lookup since STAGE_HISTORY doesn't directly link to BL
 */
export function filterStageHistoryByBusinessLine(
  history: StageHistory[],
  opportunities: Opportunity[],
  businessLineId: string | null
): StageHistory[] {
  // null businessLineId = "Toutes" = no filter
  if (!businessLineId) {
    return history
  }

  // Build set of opportunity IDs matching the business line
  const opportunityIds = new Set(
    opportunities
      .filter((opp) => opp.businessLineId === businessLineId)
      .map((opp) => opp.id)
  )

  // Filter history to only entries for those opportunities
  return history.filter((entry) => opportunityIds.has(entry.opportunityId))
}

/**
 * Deduplicate STAGE_HISTORY entries by opportunityId + stage
 * Returns Map of stage → Set of unique opportunityIds
 *
 * Critical rule: Count each opportunity ONCE per stage within period
 */
export function deduplicateStageEntries(
  history: StageHistory[]
): Map<Stage, Set<string>> {
  const stageMap = new Map<Stage, Set<string>>()

  // Initialize map for funnel stages
  FUNNEL_STAGES.forEach((stage) => {
    stageMap.set(stage, new Set())
  })

  // Process each entry
  history.forEach((entry) => {
    const { toStage, opportunityId } = entry

    // Only track funnel stages
    if (FUNNEL_STAGES.includes(toStage)) {
      const oppSet = stageMap.get(toStage)
      if (oppSet) {
        oppSet.add(opportunityId)
      }
    }
  })

  return stageMap
}

/**
 * Calculate volumes per stage from deduplicated map
 */
export function calculateStageVolumes(
  stageMap: Map<Stage, Set<string>>
): StageVolume[] {
  return FUNNEL_STAGES.map((stage) => {
    const oppSet = stageMap.get(stage) || new Set()
    return {
      stage,
      count: oppSet.size,
      opportunityIds: Array.from(oppSet),
    }
  })
}

/**
 * Compare Business Lines (for "Toutes" view)
 * Returns analytics summary for each Business Line
 */
export function compareBusinessLines(
  history: StageHistory[],
  opportunities: Opportunity[],
  businessLines: BusinessLine[]
): BusinessLineAnalytics[] {
  return businessLines.map((bl) => {
    // Filter history for this Business Line
    const blHistory = filterStageHistoryByBusinessLine(
      history,
      opportunities,
      bl.id
    )

    // Deduplicate and calculate volumes
    const stageMap = deduplicateStageEntries(blHistory)
    const volumes = calculateStageVolumes(stageMap)

    // Extract key metrics
    const contacteVolume = volumes.find((v) => v.stage === 'Contacté')
    const echangeVolume = volumes.find((v) => v.stage === 'Échange')
    const rdvVolume = volumes.find((v) => v.stage === 'RDV')
    const propositionVolume = volumes.find((v) => v.stage === 'Proposition')
    const gagneVolume = volumes.find((v) => v.stage === 'Gagné')

    const contactes = contacteVolume?.count || 0
    const echanges = echangeVolume?.count || 0
    const rdv = rdvVolume?.count || 0
    const propositions = propositionVolume?.count || 0
    const gagnes = gagneVolume?.count || 0

    return {
      businessLineId: bl.id,
      businessLineName: bl.name,
      businessLineCode: bl.code,
      contactes,
      echanges,
      rdv,
      propositions,
      gagnes,
    }
  })
}

/**
 * Get summary KPIs for period
 */
export function calculateSummaryKPIs(volumes: StageVolume[]): {
  entrees: number
  rdv: number
  propositions: number
  gagnes: number
} {
  const contacteVolume = volumes.find((v) => v.stage === 'Contacté')
  const rdvVolume = volumes.find((v) => v.stage === 'RDV')
  const propositionVolume = volumes.find((v) => v.stage === 'Proposition')
  const gagneVolume = volumes.find((v) => v.stage === 'Gagné')

  const entrees = contacteVolume?.count || 0
  const rdv = rdvVolume?.count || 0
  const propositions = propositionVolume?.count || 0
  const gagnes = gagneVolume?.count || 0

  return {
    entrees,
    rdv,
    propositions,
    gagnes,
  }
}
