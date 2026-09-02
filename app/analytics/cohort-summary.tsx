// Cohort summary KPIs (Phase 7B)
// Displays cohort size, mature count, and key conversion rates

import type { ConversionFromContacted } from '@/lib/utils/cohort-analytics'

interface CohortSummaryProps {
  cohortSize: number
  matureCount: number
  inMaturationCount: number
  conversionsFromContacted: ConversionFromContacted[]
}

export function CohortSummary({
  cohortSize,
  matureCount,
  inMaturationCount,
  conversionsFromContacted,
}: CohortSummaryProps) {
  // Find RDV and Gagné conversions
  const rdvConversion = conversionsFromContacted.find((c) => c.stage === 'RDV')
  const gagneConversion = conversionsFromContacted.find((c) => c.stage === 'Gagné')

  return (
    <div>
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1 bg-white/[0.06] rounded-[20px] overflow-hidden">
        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            Cohorte
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {cohortSize}
          </div>
          <div className="text-xs text-text-muted mt-1">
            Opportunités entrées
          </div>
        </div>

        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            Matures
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {matureCount}
          </div>
          <div className="text-xs text-text-muted mt-1">
            Fenêtre 30j terminée
          </div>
        </div>

        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            Contacté → RDV
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {rdvConversion?.conversionRate !== null &&
            rdvConversion?.conversionRate !== undefined
              ? `${rdvConversion.conversionRate}%`
              : '—'}
          </div>
          <div className="text-xs text-text-muted mt-1">
            Conversion 30j
          </div>
        </div>

        <div className="bg-background-card p-6">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
            Contacté → Gagné
          </div>
          <div className="text-3xl font-bold text-text-primary font-syne">
            {gagneConversion?.conversionRate !== null &&
            gagneConversion?.conversionRate !== undefined
              ? `${gagneConversion.conversionRate}%`
              : '—'}
          </div>
          <div className="text-xs text-text-muted mt-1">
            Conversion 30j
          </div>
        </div>
      </div>

      {/* In maturation notice */}
      {inMaturationCount > 0 && (
        <div className="mt-3 text-xs text-text-muted/60 text-center">
          {inMaturationCount} opportunité{inMaturationCount > 1 ? 's' : ''} en
          maturation (fenêtre 30j non terminée)
        </div>
      )}
    </div>
  )
}
