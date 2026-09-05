// Efficiency summary KPI cards
// Displays: Actions, Outcomes, Revenue, Ratios

import type { EfficiencyMetrics } from '@/lib/utils/efficiency-analytics'
import type { RevenueType } from '@/types/domain'

interface EfficiencySummaryProps {
  metrics: EfficiencyMetrics
  revenueType: RevenueType | null // null for global view
  businessLineName?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRatio(value: number | null): string {
  if (value === null || value === 0) return '—'
  return value.toFixed(1)
}

export function EfficiencySummary({
  metrics,
  revenueType,
  businessLineName,
}: EfficiencySummaryProps) {
  // Determine labels based on Business Line type
  const isMRR = revenueType === 'MRR'
  const isGlobal = revenueType === null

  // Outcome label (adapt per BL)
  let outcomeLabel = 'Résultats économiques'
  if (businessLineName?.includes('Calymia')) {
    outcomeLabel = 'Abonnements démarrés'
  } else if (businessLineName?.includes('KLS3')) {
    outcomeLabel = 'Projets signés'
  } else if (businessLineName?.includes('Paul')) {
    outcomeLabel = 'RDV payés'
  } else if (businessLineName?.includes('Leverio')) {
    outcomeLabel = 'Deals signés'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-1 bg-white/[0.06] rounded-[20px] overflow-hidden">
      {/* Actions */}
      <div className="bg-background-card p-6">
        <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
          Actions réalisées
        </div>
        <div className="text-3xl font-bold text-text-primary font-syne">
          {metrics.actions}
        </div>
        <div className="text-xs text-text-muted mt-1">Activités commerciales</div>
      </div>

      {/* Outcomes */}
      <div className="bg-background-card p-6">
        <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
          {isGlobal ? 'Résultats économiques' : outcomeLabel}
        </div>
        <div className="text-3xl font-bold text-text-primary font-syne">
          {metrics.outcomes}
        </div>
        <div className="text-xs text-text-muted mt-1">Événements confirmés</div>
      </div>

      {/* Revenue / MRR */}
      {isGlobal ? (
        <>
          {/* Global: One-time Revenue */}
          <div className="bg-background-card p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              Revenu ponctuel / projet
            </div>
            <div className="text-3xl font-bold text-text-primary font-syne">
              {formatCurrency(metrics.oneTimeRevenue)}
            </div>
            <div className="text-xs text-text-muted mt-1">Revenus confirmés hors MRR</div>
          </div>

          {/* Global: MRR */}
          <div className="bg-background-card p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              Nouveau MRR
            </div>
            <div className="text-3xl font-bold text-text-primary font-syne">
              {formatCurrency(metrics.mrr)}
            </div>
            <div className="text-xs text-text-muted mt-1">MRR ajouté</div>
          </div>
        </>
      ) : isMRR ? (
        <>
          {/* CALYMIA: MRR */}
          <div className="bg-background-card p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              Nouveau MRR
            </div>
            <div className="text-3xl font-bold text-text-primary font-syne">
              {formatCurrency(metrics.mrr)}
            </div>
            <div className="text-xs text-text-muted mt-1">MRR ajouté</div>
          </div>

          {/* CALYMIA: MRR per action */}
          <div className="bg-background-card p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              MRR / action
            </div>
            <div className="text-3xl font-bold text-text-primary font-syne">
              {metrics.mrrPerAction !== null ? formatCurrency(metrics.mrrPerAction) : '—'}
            </div>
            <div className="text-xs text-text-muted mt-1">
              {metrics.actions > 0
                ? metrics.mrrPerAction === 0
                  ? 'Aucun MRR généré'
                  : 'Productivité MRR'
                : 'Aucune action'}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ONE_SHOT / PROJECT: Revenue */}
          <div className="bg-background-card p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              {revenueType === 'PROJECT' ? 'Revenue projet' : 'Revenue'}
            </div>
            <div className="text-3xl font-bold text-text-primary font-syne">
              {formatCurrency(metrics.oneTimeRevenue)}
            </div>
            <div className="text-xs text-text-muted mt-1">Revenue généré</div>
          </div>

          {/* ONE_SHOT / PROJECT: Revenue per action */}
          <div className="bg-background-card p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              Revenue / action
            </div>
            <div className="text-3xl font-bold text-text-primary font-syne">
              {metrics.valuePerAction !== null ? formatCurrency(metrics.valuePerAction) : '—'}
            </div>
            <div className="text-xs text-text-muted mt-1">
              {metrics.actions > 0
                ? metrics.valuePerAction === 0
                  ? 'Aucun revenue généré'
                  : 'Productivité revenue'
                : 'Aucune action'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
