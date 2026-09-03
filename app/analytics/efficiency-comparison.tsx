// Business Line efficiency comparison table
// Shows comparative metrics for all Business Lines

import type { BusinessLineEfficiency } from '@/lib/utils/efficiency-analytics'

interface EfficiencyComparisonProps {
  comparison: BusinessLineEfficiency[]
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
  if (value === null) return '—'
  return value.toFixed(1)
}

export function EfficiencyComparison({ comparison }: EfficiencyComparisonProps) {
  if (comparison.length === 0) {
    return (
      <div className="bg-background-card border border-border-light rounded-2xl p-8 text-center">
        <p className="text-text-muted">Aucune donnée disponible pour la période sélectionnée</p>
      </div>
    )
  }

  return (
    <div className="bg-background-card border border-border-light rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h3 className="text-lg font-semibold text-text-primary font-syne">
          Comparaison Business Lines
        </h3>
        <p className="text-sm text-text-muted mt-1">
          Effort commercial vs résultats économiques par Business Line
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Business Line
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Actions
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Outcomes
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Valeur
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Valeur / action
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Actions / outcome
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((bl, index) => {
              const isLast = index === comparison.length - 1
              const isMRR = bl.revenueType === 'MRR'

              // Determine value to show (MRR or ONE_TIME)
              const value = isMRR ? bl.metrics.mrr : bl.metrics.oneTimeRevenue
              const valuePerAction = isMRR
                ? bl.metrics.mrrPerAction
                : bl.metrics.valuePerAction

              return (
                <tr
                  key={bl.businessLineId}
                  className={!isLast ? 'border-b border-border-light' : ''}
                >
                  {/* Business Line Name */}
                  <td className="px-6 py-4 text-text-primary font-medium">
                    {bl.businessLineName}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right text-text-primary">
                    {bl.metrics.actions}
                  </td>

                  {/* Outcomes */}
                  <td className="px-6 py-4 text-right text-text-primary">
                    {bl.metrics.outcomes}
                  </td>

                  {/* Value (with label for clarity) */}
                  <td className="px-6 py-4 text-right text-text-primary">
                    <div>{formatCurrency(value)}</div>
                    {isMRR && (
                      <div className="text-xs text-text-muted mt-1">MRR</div>
                    )}
                  </td>

                  {/* Value per Action */}
                  <td className="px-6 py-4 text-right text-text-primary">
                    {valuePerAction !== null ? (
                      <>
                        <div>{formatCurrency(valuePerAction)}</div>
                        {isMRR && (
                          <div className="text-xs text-text-muted mt-1">MRR/action</div>
                        )}
                      </>
                    ) : (
                      <div className="text-text-muted">—</div>
                    )}
                  </td>

                  {/* Actions per Outcome */}
                  <td className="px-6 py-4 text-right text-text-muted">
                    {bl.metrics.actionsPerOutcome !== null
                      ? formatRatio(bl.metrics.actionsPerOutcome)
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-background-primary border-t border-border-light">
        <p className="text-xs text-text-muted/60">
          Valeur = MRR pour Calymia, revenu ponctuel / projet pour autres Business Lines.
          Ratios calculés sur la période sélectionnée uniquement.
        </p>
      </div>
    </div>
  )
}
