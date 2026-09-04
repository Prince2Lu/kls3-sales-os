// À surveiller section for Dashboard (Phase 6C-A + Phase 6C-B)
// CURRENT STATE - NOT period-filtered
// Compact vertical decision panel

import Link from 'next/link'
import type { Opportunity, Task, BusinessLine } from '@/types/domain'
import { getNextAction } from '@/lib/utils/next-action'
import { buildUrlWithBusinessLine } from '@/lib/utils/business-line-filter'

interface AttentionProps {
  opportunities: Opportunity[]
  tasks: Task[]
  selectedBusinessLineId: string | null
  businessLines?: BusinessLine[]
  currentOwner: 'Eric' | 'Lilian'
}

export function Attention({
  opportunities,
  tasks,
  selectedBusinessLineId,
  businessLines = [],
  currentOwner,
}: AttentionProps) {
  // Filter by currentOwner (personal action queue) and Business Line
  const personalOpportunities = opportunities.filter((opp) => opp.owner === currentOwner)
  const personalTasks = tasks.filter((task) => task.owner === currentOwner)

  const filteredOpportunities = selectedBusinessLineId
    ? personalOpportunities.filter((opp) => opp.businessLineId === selectedBusinessLineId)
    : personalOpportunities

  const filteredTasks = selectedBusinessLineId
    ? personalTasks.filter((task) => {
        if (!task.opportunityId) return false
        const opp = personalOpportunities.find((o) => o.id === task.opportunityId)
        return opp?.businessLineId === selectedBusinessLineId
      })
    : personalTasks

  // Active opportunities only (exclude Gagné/Perdu)
  const activeOpportunities = filteredOpportunities.filter(
    (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
  )

  // A. Overdue tasks
  const overdueTasks = filteredTasks.filter((task) => {
    if (task.status !== 'TODO') return false
    if (!task.dueAt) return false
    const now = new Date()
    const dueDate = new Date(task.dueAt)
    return dueDate < now
  }).length

  // B. Opportunities without next action
  const withoutNextAction = activeOpportunities.filter((opp) => {
    return getNextAction(opp.id, tasks) === null
  }).length

  // C. Current proposals
  const currentProposals = activeOpportunities.filter(
    (opp) => opp.stage === 'Proposition'
  ).length

  // Get Business Line CODE for URL building
  const selectedBL = businessLines.find((bl) => bl.id === selectedBusinessLineId)
  const businessLineCode = selectedBL?.code || null

  // Build navigation URLs with Business Line context preserved
  const todayUrl = buildUrlWithBusinessLine('/today', businessLineCode)

  const indicators = [
    {
      count: overdueTasks,
      label: 'Tâches en retard',
      subtitle: 'À traiter aujourd\'hui',
      href: todayUrl,
      color: 'red' as const,
    },
    {
      count: withoutNextAction,
      label: 'Sans prochaine action',
      subtitle: 'Pipeline à sécuriser',
      href: todayUrl,
      color: 'amber' as const,
    },
    {
      count: currentProposals,
      label: 'Propositions en cours',
      subtitle: 'À relancer',
      href: '/prospects',
      color: 'blue' as const,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-px w-7 bg-accent" />
        <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
          À surveiller
        </h2>
      </div>

      {/* Compact Vertical Panel */}
      <div className="bg-card-bg border border-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {indicators.map((indicator, index) => (
            <Link
              key={indicator.label}
              href={indicator.href}
              className="block p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Count */}
                <div className="flex-shrink-0 w-12 text-center">
                  {indicator.count === 0 ? (
                    <span className="text-2xl font-bold font-syne text-text-muted">
                      —
                    </span>
                  ) : (
                    <span
                      className={`text-2xl font-bold font-syne ${
                        indicator.color === 'red'
                          ? 'text-red-400'
                          : indicator.color === 'amber'
                          ? 'text-amber-400'
                          : 'text-accent'
                      }`}
                    >
                      {indicator.count}
                    </span>
                  )}
                </div>

                {/* Label & Subtitle */}
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary font-medium text-sm mb-0.5">
                    {indicator.label}
                  </div>
                  <div className="text-text-muted text-xs flex items-center gap-1">
                    {indicator.count === 0 ? (
                      <span>Aucun{indicator.label === 'Tâches en retard' ? 'e' : ''}</span>
                    ) : (
                      <>
                        {indicator.subtitle}
                        <span className="text-accent">→</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
