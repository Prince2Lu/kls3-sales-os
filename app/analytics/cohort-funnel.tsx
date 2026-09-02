// Cohort funnel conversion visualization (Phase 7B)
// Shows true conversion rates from Contacté and stage-to-stage

import type {
  ConversionFromContacted,
  StageToStageConversion,
} from '@/lib/utils/cohort-analytics'

interface CohortFunnelProps {
  conversionsFromContacted: ConversionFromContacted[]
  stageToStageConversions: StageToStageConversion[]
  matureCount: number
}

export function CohortFunnel({
  conversionsFromContacted,
  stageToStageConversions,
  matureCount,
}: CohortFunnelProps) {
  return (
    <div className="bg-background-card border border-white/[0.07] rounded-2xl p-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-7 h-[1px] bg-accent" />
        <h2 className="text-xs uppercase tracking-[0.16em] text-accent font-medium">
          Conversion Funnel 30j
        </h2>
      </div>

      {matureCount === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <p>Cette cohorte est encore en maturation.</p>
          <p className="text-xs mt-2 opacity-60">
            Les taux de conversion seront disponibles une fois la fenêtre de 30
            jours terminée.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Conversion depuis Contacté */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4">
              Conversion depuis Contacté
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {conversionsFromContacted.map((conversion) => (
                <div
                  key={conversion.stage}
                  className="text-center p-4 bg-background-primary/30 rounded-xl"
                >
                  <div className="text-2xl font-bold text-text-primary font-syne mb-1">
                    {conversion.conversionRate !== null
                      ? `${conversion.conversionRate}%`
                      : '—'}
                  </div>
                  <div className="text-xs text-text-muted leading-tight">
                    {conversion.stage}
                  </div>
                  <div className="text-xs text-text-muted/60 mt-1">
                    {conversion.reachedCount} / {conversion.matureCount}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion étape par étape */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-4">
              Conversion étape par étape
            </h3>
            <div className="space-y-3">
              {stageToStageConversions.map((conversion) => (
                <div
                  key={`${conversion.fromStage}-${conversion.toStage}`}
                  className="flex items-center justify-between p-4 bg-background-primary/30 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-text-muted">
                      {conversion.fromStage} → {conversion.toStage}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-text-muted">
                      {conversion.toCount} / {conversion.fromCount}
                    </div>
                    <div className="min-w-[60px] text-right">
                      {conversion.conversionRate !== null ? (
                        <div className="text-lg font-semibold text-text-primary font-syne">
                          {conversion.conversionRate}%
                        </div>
                      ) : (
                        <div className="text-text-muted">—</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
