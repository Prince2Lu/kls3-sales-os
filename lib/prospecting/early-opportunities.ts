// Diagnostic of Opportunities sitting before the RDV stage (Trello #51).
// Until 27/11/2026 Focus created an Opportunity at "Échange" after a mere
// conversation. Those records are invisible in the Pipeline (RDV → Perdu).
// Pure classification: no Airtable access here, the caller passes the data.

import type { Activity, ColdCallTarget, Opportunity, Stage, Task, ValueEvent } from '@/types/domain'

export const EARLY_STAGES: Stage[] = ['À prospecter', 'Contacté', 'Échange', 'Qualifié']

/**
 * A: a meeting was booked or planned => a real Opportunity, wrongly placed (should be RDV).
 * C: economic signal (value event, proposal, potential value) => review one by one.
 * B: conversations only, or nothing => should have stayed in prospecting.
 */
export type EarlyOpportunityGroup = 'A' | 'B' | 'C'

export interface EarlyOpportunityRow {
  id: string
  createdAt: string
  businessLineId: string
  owner: string
  stage: Stage
  group: EarlyOpportunityGroup
  activityResults: Record<string, number>
  hasTodoTask: boolean
  hasMeeting: boolean
  hasValueEvent: boolean
  hasPotentialValue: boolean
  linkedTargetStatuses: string[]
}

export function classifyEarlyOpportunities(data: {
  opportunities: Opportunity[]
  activities: Activity[]
  tasks: Task[]
  valueEvents: ValueEvent[]
  targets: ColdCallTarget[]
}): EarlyOpportunityRow[] {
  const byOpportunity = <T extends { opportunityId: string | null }>(items: T[]) => {
    const map = new Map<string, T[]>()
    for (const item of items) {
      if (!item.opportunityId) continue
      const list = map.get(item.opportunityId) ?? []
      list.push(item)
      map.set(item.opportunityId, list)
    }
    return map
  }
  const activities = byOpportunity(data.activities)
  const tasks = byOpportunity(data.tasks)
  const valueEvents = byOpportunity(data.valueEvents)
  const targets = byOpportunity(data.targets)

  return data.opportunities
    .filter((opportunity) => EARLY_STAGES.includes(opportunity.stage))
    .map((opportunity) => {
      const oppActivities = activities.get(opportunity.id) ?? []
      const oppTasks = tasks.get(opportunity.id) ?? []
      const activityResults: Record<string, number> = {}
      for (const activity of oppActivities) {
        const key = activity.result ?? `${activity.type} (sans résultat)`
        activityResults[key] = (activityResults[key] ?? 0) + 1
      }
      const hasMeeting =
        oppActivities.some((a) => a.result === 'MEETING_BOOKED' || a.type === 'MEETING') ||
        oppTasks.some((t) => t.type === 'MEETING' && t.status !== 'CANCELLED')
      const hasValueEvent = (valueEvents.get(opportunity.id) ?? []).some((v) => v.status !== 'CANCELLED')
      const hasProposal = oppActivities.some((a) => a.type === 'PROPOSAL')
      const hasPotentialValue = (opportunity.potentialValue ?? 0) > 0
      const group: EarlyOpportunityGroup = hasMeeting
        ? 'A'
        : hasValueEvent || hasProposal || hasPotentialValue
          ? 'C'
          : 'B'
      return {
        id: opportunity.id,
        createdAt: opportunity.createdAt,
        businessLineId: opportunity.businessLineId,
        owner: opportunity.owner,
        stage: opportunity.stage,
        group,
        activityResults,
        hasTodoTask: oppTasks.some((t) => t.status === 'TODO'),
        hasMeeting,
        hasValueEvent,
        hasPotentialValue,
        linkedTargetStatuses: (targets.get(opportunity.id) ?? []).map((t) => t.callStatus),
      }
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function summarizeEarlyOpportunities(rows: EarlyOpportunityRow[]) {
  const count = (key: (row: EarlyOpportunityRow) => string) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      const k = key(row)
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
  return {
    total: rows.length,
    byGroup: count((r) => r.group),
    byStage: count((r) => r.stage),
    byBusinessLine: count((r) => r.businessLineId),
    byCreationMonth: count((r) => (r.createdAt ?? '').slice(0, 7) || 'inconnu'),
  }
}
