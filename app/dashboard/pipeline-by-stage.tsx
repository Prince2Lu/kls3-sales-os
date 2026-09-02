// Pipeline by Stage for Dashboard (Phase 6B)
// CURRENT STATE - NOT period-filtered
// Shows distribution of open opportunities across funnel stages

import type { Opportunity } from '@/types/domain'

interface PipelineByStageProps {
  opportunities: Opportunity[]
  selectedBusinessLineId: string | null
}

interface StageData {
  stage: string
  count: number
  value: number
}

const ACTIVE_STAGES = [
  'À prospecter',
  'Contacté',
  'Échange',
  'Qualifié',
  'RDV',
  'Opportunité',
  'Proposition',
]

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} €`
}

export function PipelineByStage({
  opportunities,
  selectedBusinessLineId,
}: PipelineByStageProps) {
  // Filter by Business Line
  const filteredOpportunities = selectedBusinessLineId
    ? opportunities.filter((opp) => opp.businessLineId === selectedBusinessLineId)
    : opportunities

  // Filter to open opportunities only (exclude Gagné/Perdu)
  const openOpportunities = filteredOpportunities.filter(
    (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
  )

  // Group by stage
  const stageData: StageData[] = ACTIVE_STAGES.map((stage) => {
    const stageOpps = openOpportunities.filter((opp) => opp.stage === stage)
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, opp) => sum + (opp.potentialValue || 0), 0),
    }
  })

  // Calculate max value for bar sizing
  const maxValue = Math.max(...stageData.map((s) => s.value), 1)

  // Calculate total for consistency check
  const totalCount = stageData.reduce((sum, s) => sum + s.count, 0)
  const totalValue = stageData.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-px w-7 bg-accent" />
        <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
          Pipeline par étape
        </h2>
      </div>

      {/* Stage Breakdown */}
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        {totalCount === 0 ? (
          <div className="text-text-muted text-sm">
            Aucune opportunité ouverte
          </div>
        ) : (
          <div className="space-y-3">
            {stageData.map((stage) => (
              <div key={stage.stage} className="space-y-1">
                {/* Stage Info */}
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-3 min-w-0 flex-1">
                    <span className="text-text-primary font-medium text-sm whitespace-nowrap">
                      {stage.stage}
                    </span>
                    <span className="text-text-muted text-xs">
                      {stage.count} opportunité{stage.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-text-primary font-semibold text-sm font-syne whitespace-nowrap">
                    {formatCurrency(stage.value)}
                  </span>
                </div>

                {/* Visual Bar */}
                {stage.value > 0 && (
                  <div className="h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent/40 rounded-full transition-all"
                      style={{
                        width: `${(stage.value / maxValue) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-text-primary font-semibold text-sm">
                    Total
                  </span>
                  <span className="text-text-muted text-xs">
                    {totalCount} opportunité{totalCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-text-primary font-bold text-sm font-syne">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
