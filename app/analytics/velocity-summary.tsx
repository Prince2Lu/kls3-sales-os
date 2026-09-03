// Velocity summary KPI cards (Phase 7C)
// Displays 4 key transition medians: Contacté→RDV, RDV→Proposition, Proposition→Gagné, Contacté→Gagné

import type { TransitionMetrics } from '@/lib/utils/velocity-analytics'
import { formatDuration } from '@/lib/utils/velocity-analytics'

interface VelocitySummaryProps {
  metrics: TransitionMetrics[]
}

interface SummaryKPI {
  label: string
  fromStage: string
  toStage: string
  subtext: string
}

const SUMMARY_KPIS: SummaryKPI[] = [
  {
    label: 'Contacté → RDV',
    fromStage: 'Contacté',
    toStage: 'RDV',
    subtext: 'Temps pour obtenir RDV',
  },
  {
    label: 'RDV → Proposition',
    fromStage: 'RDV',
    toStage: 'Proposition',
    subtext: 'Temps pour envoyer proposition',
  },
  {
    label: 'Proposition → Gagné',
    fromStage: 'Proposition',
    toStage: 'Gagné',
    subtext: 'Temps pour closer',
  },
  {
    label: 'Contacté → Gagné',
    fromStage: 'Contacté',
    toStage: 'Gagné',
    subtext: 'Cycle de vente complet',
  },
]

export function VelocitySummary({ metrics }: VelocitySummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-1 bg-white/[0.06] rounded-[20px] overflow-hidden">
      {SUMMARY_KPIS.map((kpi) => {
        const metric = metrics.find(
          (m) => m.fromStage === kpi.fromStage && m.toStage === kpi.toStage
        )

        const medianDays = metric?.medianDays ?? null
        const sampleSize = metric?.sampleSize ?? 0

        return (
          <div key={kpi.label} className="bg-background-card p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              {kpi.label}
            </div>
            <div className="text-3xl font-bold text-text-primary font-syne">
              {formatDuration(medianDays)}
            </div>
            <div className="text-xs text-text-muted mt-1">
              {sampleSize > 0 ? `${sampleSize} dossier${sampleSize > 1 ? 's' : ''}` : kpi.subtext}
            </div>
          </div>
        )
      })}
    </div>
  )
}
