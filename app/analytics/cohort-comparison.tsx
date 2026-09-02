// Cohort Business Line comparison (Phase 7B)
// Displayed when "Toutes" is selected

import type { BusinessLineCohortMetrics } from '@/lib/utils/cohort-analytics'

interface CohortComparisonProps {
  comparison: BusinessLineCohortMetrics[]
}

export function CohortComparison({ comparison }: CohortComparisonProps) {
  return (
    <div className="bg-background-card border border-white/[0.07] rounded-2xl p-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-7 h-[1px] bg-accent" />
        <h2 className="text-xs uppercase tracking-[0.16em] text-accent font-medium">
          Comparaison Business Lines
        </h2>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-text-muted font-medium">
                Business Line
              </th>
              <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-text-muted font-medium">
                Cohorte mature
              </th>
              <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-text-muted font-medium">
                Contacté → Échange
              </th>
              <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-text-muted font-medium">
                Contacté → RDV
              </th>
              <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-text-muted font-medium">
                Contacté → Gagné
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((bl) => (
              <tr
                key={bl.businessLineId}
                className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="font-medium text-text-primary">
                    {bl.businessLineName}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {bl.businessLineCode}
                  </div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="text-lg font-semibold text-text-primary font-syne">
                    {bl.matureCount}
                  </div>
                </td>
                <td className="text-right py-4 px-4">
                  {bl.contacteToEchange !== null ? (
                    <div className="text-lg font-semibold text-text-primary font-syne">
                      {bl.contacteToEchange}%
                    </div>
                  ) : (
                    <div className="text-text-muted">—</div>
                  )}
                </td>
                <td className="text-right py-4 px-4">
                  {bl.contacteToRdv !== null ? (
                    <div className="text-lg font-semibold text-text-primary font-syne">
                      {bl.contacteToRdv}%
                    </div>
                  ) : (
                    <div className="text-text-muted">—</div>
                  )}
                </td>
                <td className="text-right py-4 px-4">
                  {bl.contacteToGagne !== null ? (
                    <div className="text-lg font-semibold text-text-primary font-syne">
                      {bl.contacteToGagne}%
                    </div>
                  ) : (
                    <div className="text-text-muted">—</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {comparison.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          <p>Aucune Business Line configurée</p>
        </div>
      )}

      {/* Explanation */}
      <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
        <p className="text-xs text-text-muted leading-relaxed">
          Comparez les taux de conversion 30j de chaque Business Line sur la
          cohorte mature. Sélectionnez une Business Line spécifique pour voir le
          détail du funnel de conversion.
        </p>
      </div>
    </div>
  )
}
