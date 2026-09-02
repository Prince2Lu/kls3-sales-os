// Business Line summary cards for Dashboard (Toutes view only)
// Compact operational/economic summary per Business Line

import type { BusinessLine, ValueEvent, Opportunity, Activity, Task } from '@/types/domain'
import { calculatePipeline } from '@/lib/utils/dashboard-kpis'

interface BusinessLineCardsProps {
  businessLines: BusinessLine[]
  valueEvents: ValueEvent[] // ALL Value Events (for CURRENT STATE like MRR)
  periodFilteredValueEvents: ValueEvent[] // Period-filtered (for PERIOD FLOW like revenue)
  opportunities: Opportunity[]
  activities: Activity[]
  tasks: Task[]
  onSelectBusinessLine: (businessLineId: string) => void
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} €`
}

function formatMRR(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} € / mois`
}

export function BusinessLineCards({
  businessLines,
  valueEvents,
  periodFilteredValueEvents,
  opportunities,
  activities,
  tasks,
  onSelectBusinessLine,
}: BusinessLineCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {businessLines.map((bl) => {
        // Filter data for this Business Line
        const blOpps = opportunities.filter((opp) => opp.businessLineId === bl.id)
        const blAllValueEvents = valueEvents.filter((ve) => ve.businessLineId === bl.id)
        const blPeriodValueEvents = periodFilteredValueEvents.filter((ve) => ve.businessLineId === bl.id)

        // CURRENT STATE: Open Opportunities (NOT period-filtered)
        const openOpps = blOpps.filter(
          (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
        ).length

        // CURRENT STATE: Pipeline (NOT period-filtered)
        const pipeline = calculatePipeline(blOpps)

        // Calculate business-specific KPIs
        const confirmedPeriodEvents = blPeriodValueEvents.filter(
          (ve) => ve.status === 'CONFIRMED' || ve.status === 'PAID'
        )

        const confirmedAllEvents = blAllValueEvents.filter(
          (ve) => ve.status === 'CONFIRMED' || ve.status === 'PAID'
        )

        let specificKPI = ''
        let specificValue = ''

        if (bl.code === 'PAUL') {
          // PERIOD FLOW: Paid Meetings in selected period
          const paidMeetings = confirmedPeriodEvents.filter(
            (ve) => ve.eventType === 'PAID_MEETING'
          ).length
          specificKPI = 'RDV rémunérés'
          specificValue = `${paidMeetings}`

          // PERIOD FLOW: Revenue from period
          const revenue = confirmedPeriodEvents.reduce((sum, ve) => sum + (ve.amount || 0), 0)
          if (revenue > 0) {
            specificValue += ` · ${formatCurrency(revenue)}`
          }
        } else if (bl.code === 'SACHA') {
          // PERIOD FLOW: Signed Deals in selected period
          const signedDeals = confirmedPeriodEvents.filter(
            (ve) => ve.eventType === 'SIGNED_DEAL'
          ).length
          specificKPI = 'Signatures'
          specificValue = `${signedDeals}`

          // PERIOD FLOW: Revenue from period
          const revenue = confirmedPeriodEvents.reduce((sum, ve) => sum + (ve.amount || 0), 0)
          if (revenue > 0) {
            specificValue += ` · ${formatCurrency(revenue)}`
          }
        } else if (bl.code === 'CALYMIA') {
          // PERIOD FLOW: Subscriptions started in selected period
          const subscriptionsStarted = confirmedPeriodEvents.filter(
            (ve) => ve.eventType === 'SUBSCRIPTION_STARTED'
          ).length

          // CURRENT STATE: MRR (NOT period-filtered)
          const mrr = confirmedAllEvents
            .filter((ve) => ve.revenueType === 'MRR')
            .reduce((sum, ve) => sum + (ve.amount || 0), 0)

          specificKPI = 'Nouveaux abonnements'
          specificValue = `${subscriptionsStarted}`
          if (mrr > 0) {
            specificValue += ` · MRR ${formatMRR(mrr)}`
          }
        } else if (bl.code === 'KLS3_NOTAIRES') {
          // PERIOD FLOW: Signed Projects in selected period
          const signedProjects = confirmedPeriodEvents.filter(
            (ve) => ve.eventType === 'SIGNED_PROJECT'
          ).length

          // PERIOD FLOW: Revenue from period
          const revenue = confirmedPeriodEvents.reduce((sum, ve) => sum + (ve.amount || 0), 0)

          specificKPI = 'Projets signés'
          specificValue = `${signedProjects}`
          if (revenue > 0) {
            specificValue += ` · ${formatCurrency(revenue)}`
          }
        }

        return (
          <button
            key={bl.id}
            onClick={() => onSelectBusinessLine(bl.id)}
            className="bg-card-bg border border-border rounded-2xl p-6 text-left hover:border-accent/50 transition-colors"
          >
            <div className="space-y-4">
              {/* Business Line Name */}
              <div>
                <h3 className="font-semibold font-syne text-lg">{bl.name}</h3>
              </div>

              {/* CURRENT STATE: Open Opportunities & Pipeline */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">Opportunités ouvertes</span>
                  <span className="font-medium">{openOpps}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">Pipeline</span>
                  <span className="font-medium">{formatCurrency(pipeline)}</span>
                </div>
              </div>

              {/* PERIOD FLOW: Business-Specific KPI */}
              {specificKPI && (
                <div className="pt-2 border-t border-border">
                  <div className="text-text-muted text-xs uppercase tracking-wide mb-1">
                    {specificKPI}
                  </div>
                  <div className="text-sm font-medium">
                    {specificValue || '—'}
                  </div>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
