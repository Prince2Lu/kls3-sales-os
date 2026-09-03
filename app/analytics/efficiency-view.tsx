// Efficiency view container (Phase 7D)
// Business Line efficiency analytics: effort vs economic outcomes

import type { Activity, ValueEvent, Opportunity, BusinessLine } from '@/types/domain'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import type { PeriodType } from '@/lib/utils/period'
import { getVelocityPeriodDateRange } from '@/lib/utils/velocity-period'
import {
  calculateSingleBusinessLineEfficiency,
  calculateGlobalEfficiencyMetrics,
  calculateAllBusinessLineEfficiency,
} from '@/lib/utils/efficiency-analytics'
import { EfficiencyFilters } from './efficiency-filters'
import { EfficiencySummary } from './efficiency-summary'
import { EfficiencyComparison } from './efficiency-comparison'

interface EfficiencyViewProps {
  activities: Activity[]
  valueEvents: ValueEvent[]
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  selectedBusinessLineCode: BusinessLineCode | null
  selectedPeriod: PeriodType
}

export function EfficiencyView({
  activities,
  valueEvents,
  opportunities,
  businessLines,
  selectedBusinessLineCode,
  selectedPeriod,
}: EfficiencyViewProps) {
  // Get period date range in Europe/Paris timezone
  const period = getVelocityPeriodDateRange(selectedPeriod)

  // Find selected Business Line
  const selectedBusinessLine = selectedBusinessLineCode
    ? businessLines.find((bl) => bl.code === selectedBusinessLineCode) || null
    : null

  // Calculate metrics
  const metrics = selectedBusinessLine
    ? calculateSingleBusinessLineEfficiency(
        activities,
        valueEvents,
        opportunities,
        selectedBusinessLine.id,
        period
      )
    : calculateGlobalEfficiencyMetrics(activities, valueEvents, period)

  // Business Line comparison (only when "Toutes" selected)
  const comparison = !selectedBusinessLine
    ? calculateAllBusinessLineEfficiency(
        activities,
        valueEvents,
        opportunities,
        businessLines,
        period
      )
    : null

  return (
    <div className="space-y-6">
      {/* Filters */}
      <EfficiencyFilters
        businessLines={businessLines}
        selectedBusinessLineCode={selectedBusinessLineCode}
        selectedPeriod={selectedPeriod}
      />

      {/* Summary KPIs */}
      <EfficiencySummary
        metrics={metrics}
        revenueType={selectedBusinessLine?.revenueType || null}
        businessLineName={selectedBusinessLine?.name}
      />

      {/* Business Line Comparison (only in "Toutes" mode) */}
      {comparison && <EfficiencyComparison comparison={comparison} />}
    </div>
  )
}
