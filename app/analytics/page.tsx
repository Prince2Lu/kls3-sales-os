// Analytics page (Phase 7A)
// Funnel analysis using STAGE_HISTORY as source of truth

import {
  getStageHistory,
  getOpportunities,
  getBusinessLines,
} from '@/lib/airtable'
import { parseBusinessLineParam } from '@/lib/utils/business-line-filter'
import { getPeriodDateRange, type PeriodType } from '@/lib/utils/period'
import {
  filterStageHistoryByPeriod,
  filterStageHistoryByBusinessLine,
  deduplicateStageEntries,
  calculateStageVolumes,
  compareBusinessLines,
  calculateSummaryKPIs,
} from '@/lib/utils/funnel-analytics'
import { AnalyticsFilters } from './analytics-filters'
import { FunnelFlow } from './funnel-flow'
import { BusinessLineComparison } from './business-line-comparison'

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ businessLine?: string; period?: string }>
}) {
  // Await searchParams (Next.js 16 async model)
  const searchParams = await props.searchParams

  // Parse filters from URL
  const selectedBusinessLineCode = parseBusinessLineParam(searchParams.businessLine)

  // Parse period with fallback to 'month'
  const validPeriods: PeriodType[] = ['week', 'month', 'last30days', 'last90days']
  const periodParam = searchParams.period as PeriodType
  const selectedPeriod: PeriodType = validPeriods.includes(periodParam)
    ? periodParam
    : 'month'

  // Fetch all data
  const [allStageHistory, allOpportunities, businessLines] = await Promise.all([
    getStageHistory({ maxRecords: 5000 }),
    getOpportunities({ maxRecords: 1000 }),
    getBusinessLines(),
  ])

  // Get period date range
  const periodRange = getPeriodDateRange(selectedPeriod)

  // Filter STAGE_HISTORY by period
  const periodHistory = filterStageHistoryByPeriod(allStageHistory, periodRange)

  // Find selected Business Line (null = "Toutes")
  const selectedBusinessLine = selectedBusinessLineCode
    ? businessLines.find((bl) => bl.code === selectedBusinessLineCode) || null
    : null

  // Filter by Business Line if selected
  const filteredHistory = filterStageHistoryByBusinessLine(
    periodHistory,
    allOpportunities,
    selectedBusinessLine?.id || null
  )

  // Deduplicate and calculate volumes
  const stageMap = deduplicateStageEntries(filteredHistory)
  const volumes = calculateStageVolumes(stageMap)

  // Calculate summary KPIs
  const summaryKPIs = calculateSummaryKPIs(volumes)

  // Business Line comparison (only when "Toutes" selected)
  const businessLineComparison = !selectedBusinessLine
    ? compareBusinessLines(periodHistory, allOpportunities, businessLines)
    : null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary font-syne mb-2">
          Analytics
        </h1>
        <p className="text-sm text-text-muted mb-1">
          Analyse du funnel commercial par Business Line et période
        </p>
        <p className="text-xs text-text-muted/60">
          Basé uniquement sur les changements de stage enregistrés pendant la période.
        </p>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        businessLines={businessLines}
        selectedBusinessLineCode={selectedBusinessLineCode}
        selectedPeriod={selectedPeriod}
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1 bg-white/[0.06] rounded-[20px] overflow-hidden">
        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            Entrées funnel
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {summaryKPIs.entrees}
          </div>
          <div className="text-xs text-text-muted mt-1">Contactés</div>
        </div>

        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            RDV générés
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {summaryKPIs.rdv}
          </div>
          <div className="text-xs text-text-muted mt-1">RDV obtenus</div>
        </div>

        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            Propositions
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {summaryKPIs.propositions}
          </div>
          <div className="text-xs text-text-muted mt-1">Propositions envoyées</div>
        </div>

        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            Gagnés
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {summaryKPIs.gagnes}
          </div>
          <div className="text-xs text-text-muted mt-1">Opportunités fermées</div>
        </div>
      </div>

      {/* Funnel Flow */}
      <FunnelFlow volumes={volumes} />

      {/* Business Line Comparison (only in "Toutes" mode) */}
      {businessLineComparison && (
        <BusinessLineComparison comparison={businessLineComparison} />
      )}
    </div>
  )
}
