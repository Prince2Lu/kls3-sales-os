// Cohort friction points (Phase 7B)
// Identifies lowest stage-to-stage conversion rates (minimum 5 opportunities threshold)

import type { CohortFrictionPoint } from '@/lib/utils/cohort-analytics'

interface CohortFrictionProps {
  frictionPoints: CohortFrictionPoint[]
}

export function CohortFriction({ frictionPoints }: CohortFrictionProps) {
  return (
    <div className="bg-background-card border border-white/[0.07] rounded-2xl p-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-7 h-[1px] bg-accent" />
        <h2 className="text-xs uppercase tracking-[0.16em] text-accent font-medium">
          Points de Friction
        </h2>
      </div>

      {/* Friction Points List */}
      {frictionPoints.length > 0 ? (
        <div className="space-y-4">
          {frictionPoints.map((point, index) => (
            <div
              key={`${point.fromStage}-${point.toStage}`}
              className="flex items-center justify-between p-4 bg-background-primary/50 rounded-xl border border-white/[0.05]"
            >
              <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">
                    {index + 1}
                  </span>
                </div>

                {/* Transition */}
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {point.fromStage} → {point.toStage}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {point.toCount} / {point.fromCount} opportunités convertissent
                  </div>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="text-right">
                <div className="text-2xl font-bold text-text-primary font-syne">
                  {point.conversionRate}%
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Taux de conversion
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-muted">
          <p className="text-sm">
            Volume insuffisant pour identifier des points de friction
          </p>
          <p className="text-xs mt-2 opacity-60">
            (Minimum 5 opportunités matures requises par étape)
          </p>
        </div>
      )}

      {/* Explanation */}
      <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
        <p className="text-xs text-text-muted leading-relaxed">
          Les points de friction identifient les transitions du funnel avec les
          taux de conversion les plus faibles sur la cohorte mature (fenêtre 30j).
          Focus recommandé sur ces étapes pour améliorer la conversion globale.
        </p>
      </div>
    </div>
  )
}
