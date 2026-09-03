// Velocity transitions detail table (Phase 7C)
// Detailed metrics for each transition: median, average, min, max, sample size

import type { TransitionMetrics } from '@/lib/utils/velocity-analytics'
import { formatDuration } from '@/lib/utils/velocity-analytics'

interface VelocityTransitionsProps {
  metrics: TransitionMetrics[]
}

export function VelocityTransitions({ metrics }: VelocityTransitionsProps) {
  // Filter out transitions with no data
  const validMetrics = metrics.filter((m) => m.sampleSize > 0)

  if (validMetrics.length === 0) {
    return (
      <div className="bg-background-card border border-border-light rounded-2xl p-8 text-center">
        <p className="text-text-muted">
          Pas assez de données sur cette période.
        </p>
        <p className="text-sm text-text-muted/60 mt-2">
          Essayez une période plus large ou une autre Business Line.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background-card border border-border-light rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h3 className="text-lg font-semibold text-text-primary font-syne">
          Détail des transitions
        </h3>
        <p className="text-sm text-text-muted mt-1">
          Temps médian et statistiques pour chaque étape du funnel
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Transition
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Médiane
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Moyenne
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Min
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                Max
              </th>
              <th className="text-right px-6 py-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                N
              </th>
            </tr>
          </thead>
          <tbody>
            {validMetrics.map((metric, index) => (
              <tr
                key={`${metric.fromStage}-${metric.toStage}`}
                className={
                  index !== validMetrics.length - 1
                    ? 'border-b border-border-light'
                    : ''
                }
              >
                <td className="px-6 py-4 text-text-primary">
                  {metric.fromStage} → {metric.toStage}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-text-primary">
                  {formatDuration(metric.medianDays)}
                </td>
                <td className="px-6 py-4 text-right text-text-muted">
                  {formatDuration(metric.averageDays)}
                </td>
                <td className="px-6 py-4 text-right text-text-muted">
                  {formatDuration(metric.minDays)}
                </td>
                <td className="px-6 py-4 text-right text-text-muted">
                  {formatDuration(metric.maxDays)}
                </td>
                <td className="px-6 py-4 text-right text-text-muted">
                  {metric.sampleSize}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="px-6 py-3 bg-background-primary border-t border-border-light">
        <p className="text-xs text-text-muted/60">
          La médiane est le KPI principal (résistant aux valeurs extrêmes).
          Tous les outliers sont conservés dans le calcul.
        </p>
      </div>
    </div>
  )
}
