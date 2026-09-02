// Cohort conversion view (Phase 7B)
// Main orchestrator for cohort conversion analytics

import type { StageHistory, Opportunity, BusinessLine } from '@/types/domain'
import type { CohortPeriodType } from '@/lib/utils/cohort-analytics'
import {
  getCohortPeriodRange,
  buildCohort,
  buildStageReachedMap,
  calculateConversionsFromContacted,
  calculateStageToStageConversions,
  detectCohortFrictionPoints,
  compareBusinessLinesCohort,
  countDataQualityIssues,
} from '@/lib/utils/cohort-analytics'
import { getNowInParis } from '@/lib/utils/timezone'
import { CohortFilters } from './cohort-filters'
import { CohortSummary } from './cohort-summary'
import { CohortFunnel } from './cohort-funnel'
import { CohortFriction } from './cohort-friction'
import { CohortComparison } from './cohort-comparison'
import { DataQualityWarning } from './data-quality-warning'

interface CohortViewProps {
  stageHistory: StageHistory[]
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  selectedBusinessLineCode: string | null
  selectedCohortPeriod: CohortPeriodType
}

export function CohortView({
  stageHistory,
  opportunities,
  businessLines,
  selectedBusinessLineCode,
  selectedCohortPeriod,
}: CohortViewProps) {
  // CRITICAL: Use explicit Europe/Paris timezone for all cohort calculations
  const now = getNowInParis()

  // Get cohort period range
  const cohortPeriodRange = getCohortPeriodRange(selectedCohortPeriod, now)

  // Build cohort (all opportunities that entered Contacté during period)
  const allCohortEntries = buildCohort(
    stageHistory,
    opportunities,
    cohortPeriodRange,
    now
  )

  // Filter cohort by Business Line if selected
  const selectedBusinessLine = selectedBusinessLineCode
    ? businessLines.find((bl) => bl.code === selectedBusinessLineCode) || null
    : null

  const filteredCohortEntries = selectedBusinessLine
    ? allCohortEntries.filter(
        (entry) => entry.businessLineId === selectedBusinessLine.id
      )
    : allCohortEntries

  // Split mature vs in-maturation
  const matureCohort = filteredCohortEntries.filter((e) => e.isMature)
  const inMaturationCohort = filteredCohortEntries.filter((e) => !e.isMature)

  // Build stage reached map (only for matures)
  const stageReachedMap = buildStageReachedMap(matureCohort, stageHistory)

  // Calculate conversions
  const conversionsFromContacted = calculateConversionsFromContacted(
    filteredCohortEntries,
    stageReachedMap
  )

  const stageToStageConversions = calculateStageToStageConversions(
    filteredCohortEntries,
    stageReachedMap,
    stageHistory
  )

  // Detect friction points
  const frictionPoints = detectCohortFrictionPoints(
    stageToStageConversions,
    5
  )

  // Business Line comparison (only when "Toutes" selected)
  const businessLineComparison = !selectedBusinessLine
    ? compareBusinessLinesCohort(
        allCohortEntries,
        buildStageReachedMap(
          allCohortEntries.filter((e) => e.isMature),
          stageHistory
        ),
        businessLines
      )
    : null

  // Data quality check
  const dataQualityIssues = countDataQualityIssues(
    opportunities,
    stageHistory,
    selectedBusinessLine?.id || null
  )

  return (
    <div className="space-y-6">
      {/* Filters */}
      <CohortFilters
        businessLines={businessLines}
        selectedBusinessLineCode={selectedBusinessLineCode}
        selectedCohortPeriod={selectedCohortPeriod}
      />

      {/* Summary KPIs */}
      <CohortSummary
        cohortSize={filteredCohortEntries.length}
        matureCount={matureCohort.length}
        inMaturationCount={inMaturationCohort.length}
        conversionsFromContacted={conversionsFromContacted}
      />

      {/* Data Quality Warning */}
      <DataQualityWarning issueCount={dataQualityIssues} />

      {/* Conversion Funnel */}
      <CohortFunnel
        conversionsFromContacted={conversionsFromContacted}
        stageToStageConversions={stageToStageConversions}
        matureCount={matureCohort.length}
      />

      {/* Friction Points */}
      {matureCohort.length > 0 && (
        <CohortFriction frictionPoints={frictionPoints} />
      )}

      {/* Business Line Comparison (only in "Toutes" mode) */}
      {businessLineComparison && (
        <CohortComparison comparison={businessLineComparison} />
      )}

      {/* Empty State - No cohort */}
      {filteredCohortEntries.length === 0 && (
        <div className="bg-background-card border border-white/[0.07] rounded-2xl p-12 text-center">
          <p className="text-text-muted">
            Aucune opportunité dans cette cohorte.
          </p>
          <p className="text-xs text-text-muted/60 mt-2">
            Aucune opportunité n'est entrée dans "Contacté" pendant la période
            sélectionnée.
          </p>
        </div>
      )}
    </div>
  )
}
