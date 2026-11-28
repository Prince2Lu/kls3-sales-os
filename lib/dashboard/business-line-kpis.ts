// The 6 Dashboard KPIs per business line (Trello #62).
// Activity → conversion → value, for the selected period:
//   calls, conversations, meetings booked, meeting rate (meetings / calls),
//   weighted pipeline (open opportunities, value × probability, current state),
//   realised revenue (VALUE_EVENTS CONFIRMED or PAID in the period; MRR shown apart).
// Counting reuses the Goals measurement so both screens always agree.

import type { BusinessLine, Opportunity } from '@/types/domain'
import type { DateRange } from '@/lib/utils/period'
import { measureGoalMetric, type GoalData } from '@/lib/goals/goal-progress'

export type BusinessLineKpiRow = {
  businessLine: BusinessLine
  calls: number
  conversations: number
  meetings: number
  /** Meetings per call, between 0 and 1; null when there were no calls. */
  meetingRate: number | null
  weightedPipeline: number
  /** Open opportunities with a value but no probability: they add 0 to the weighted pipeline. */
  openWithoutProbability: number
  revenue: number
  newMrr: number
}

/** Probability is entered in % (0–100); a 0–1 value is accepted too. */
export function probabilityRatio(probability: number | null | undefined): number | null {
  if (probability === null || probability === undefined || Number.isNaN(probability)) return null
  const ratio = probability > 1 ? probability / 100 : probability
  return Math.min(Math.max(ratio, 0), 1)
}

export function weightedPipeline(opportunities: Opportunity[]): { value: number; withoutProbability: number } {
  let value = 0
  let withoutProbability = 0
  for (const opportunity of opportunities) {
    if (opportunity.stage === 'Gagné' || opportunity.stage === 'Perdu') continue
    const amount = opportunity.potentialValue || 0
    const ratio = probabilityRatio(opportunity.probability)
    if (ratio === null) {
      if (amount > 0) withoutProbability += 1
      continue
    }
    value += amount * ratio
  }
  return { value: Math.round(value), withoutProbability }
}

export function buildBusinessLineKpis(input: {
  businessLines: BusinessLine[]
  period: DateRange
  data: GoalData
}): BusinessLineKpiRow[] {
  return input.businessLines
    .filter((line) => line.active)
    .map((businessLine) => {
      const measure = (metric: Parameters<typeof measureGoalMetric>[0]) =>
        measureGoalMetric(metric, businessLine.id, input.period, input.data)
      const calls = measure('CALLS')
      const meetings = measure('MEETINGS')
      const pipeline = weightedPipeline(
        input.data.opportunities.filter((opportunity) => opportunity.businessLineId === businessLine.id)
      )
      return {
        businessLine,
        calls,
        conversations: measure('CONVERSATIONS'),
        meetings,
        meetingRate: calls > 0 ? meetings / calls : null,
        weightedPipeline: pipeline.value,
        openWithoutProbability: pipeline.withoutProbability,
        revenue: measure('REVENUE'),
        newMrr: measure('NEW_MRR'),
      }
    })
}
