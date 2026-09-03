// Velocity view container (Phase 7C)
// Sales velocity analytics: measures time-to-transition for opportunities

import type { StageHistory, Opportunity, BusinessLine } from '@/types/domain'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import type { PeriodType } from '@/lib/utils/period'
import { getVelocityPeriodDateRange } from '@/lib/utils/velocity-period'
import {
  calculateAllVelocityMetrics,
  compareBusinessLinesVelocity,
} from '@/lib/utils/velocity-analytics'
import { VelocityFilters } from './velocity-filters'
import { VelocitySummary } from './velocity-summary'
import { VelocityTransitions } from './velocity-transitions'
import { VelocityComparison } from './velocity-comparison'

interface VelocityViewProps {
  stageHistory: StageHistory[]
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  selectedBusinessLineCode: BusinessLineCode | null
  selectedPeriod: PeriodType
}

export function VelocityView({
  stageHistory,
  opportunities,
  businessLines,
  selectedBusinessLineCode,
  selectedPeriod,
}: VelocityViewProps) {
  // Get period date range in Europe/Paris timezone
  const period = getVelocityPeriodDateRange(selectedPeriod)

  // Find selected Business Line
  const selectedBusinessLine = selectedBusinessLineCode
    ? businessLines.find((bl) => bl.code === selectedBusinessLineCode) || null
    : null

  // Calculate velocity metrics
  const metrics = calculateAllVelocityMetrics(
    stageHistory,
    opportunities,
    period,
    selectedBusinessLine?.id || null
  )

  // Business Line comparison (only when "Toutes" selected)
  const comparison = !selectedBusinessLine
    ? compareBusinessLinesVelocity(stageHistory, opportunities, businessLines, period)
    : null

  return (
    <div className="space-y-6">
      {/* Filters */}
      <VelocityFilters
        businessLines={businessLines}
        selectedBusinessLineCode={selectedBusinessLineCode}
        selectedPeriod={selectedPeriod}
      />

      {/* Summary KPIs */}
      <VelocitySummary metrics={metrics} />

      {/* Detailed Transitions */}
      <VelocityTransitions metrics={metrics} />

      {/* Business Line Comparison (only in "Toutes" mode) */}
      {comparison && <VelocityComparison comparison={comparison} />}
    </div>
  )
}
