// Commercial Activity metrics for Dashboard
// Calls, Conversations, Meetings, Opportunities Created (PERIOD FLOW)
// Propositions, Wins (CURRENT STATE)

import type { Activity, Opportunity, BusinessLine } from '@/types/domain'
import type { DateRange, PeriodType } from '@/lib/utils/period'
import {
  countCalls,
  countConversations,
  countMeetings,
  countOpportunitiesCreated,
  countProposals,
  countWinsInPeriod,
} from '@/lib/utils/dashboard-kpis'

interface CommercialActivityProps {
  activities: Activity[]
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  selectedBusinessLineId: string | null
  period: DateRange
  selectedPeriod: PeriodType
}

export function CommercialActivity({
  activities,
  opportunities,
  businessLines,
  selectedBusinessLineId,
  period,
  selectedPeriod,
}: CommercialActivityProps) {
  // Period labels
  const periodLabels: Record<PeriodType, string> = {
    today: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois',
    custom: 'Période personnalisée',
  }
  // Filter data by selected Business Line if applicable
  const filteredActivities = selectedBusinessLineId
    ? activities.filter((activity) => {
        // Activities link to opportunities, opportunities link to business lines
        const opportunity = opportunities.find((opp) => opp.id === activity.opportunityId)
        return opportunity?.businessLineId === selectedBusinessLineId
      })
    : activities

  const filteredOpportunities = selectedBusinessLineId
    ? opportunities.filter((opp) => opp.businessLineId === selectedBusinessLineId)
    : opportunities

  // Calculate metrics
  // PERIOD FLOW - period-filtered
  const calls = countCalls(filteredActivities, period)
  const conversations = countConversations(filteredActivities, period)
  const meetings = countMeetings(filteredActivities, period)
  const opportunitiesCreated = countOpportunitiesCreated(filteredOpportunities, period)

  // CURRENT STATE - NOT period-filtered
  const proposalsEnCours = countProposals(filteredOpportunities)

  // PERIOD FLOW - period-filtered by wonAt
  const wins = countWinsInPeriod(filteredOpportunities, period)

  const metrics = [
    { label: 'Appels', value: calls, type: 'PERIOD' as const },
    { label: 'Conversations', value: conversations, type: 'PERIOD' as const },
    { label: 'RDV', value: meetings, type: 'PERIOD' as const },
    { label: 'Opportunités créées', value: opportunitiesCreated, type: 'PERIOD' as const },
    { label: 'Propositions en cours', value: proposalsEnCours, type: 'CURRENT' as const },
    { label: 'Gagnés', value: wins, type: 'PERIOD' as const },
  ]

  return (
    <div className="space-y-4">
      {/* Section Header with Period */}
      <div className="flex items-center gap-3">
        <div className="h-px w-7 bg-accent" />
        <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
          Activité commerciale — {periodLabels[selectedPeriod]}
        </h2>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-6 bg-[rgba(255,255,255,0.06)] rounded-[20px] overflow-hidden p-1">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-card-bg p-6 rounded-2xl">
            <div className="text-text-muted text-xs uppercase tracking-wide mb-2">
              {metric.label}
            </div>
            <div className="text-2xl font-semibold font-syne">
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
