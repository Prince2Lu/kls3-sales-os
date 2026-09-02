// Opportunités à suivre for Dashboard (Phase 6C-A)
// CURRENT STATE - NOT period-filtered
// Dense presentation with immediate attention reason visibility

import Link from 'next/link'
import type { Opportunity, BusinessLine, Company, Contact, Task } from '@/types/domain'
import { getNextAction, hasOverdueNextAction, hasNoNextAction } from '@/lib/utils/next-action'
import { getTaskTypeLabel } from '@/lib/utils/labels'

interface TopOpportunitiesProps {
  opportunities: Opportunity[]
  businessLines: BusinessLine[]
  companies: Company[]
  contacts: Contact[]
  tasks: Task[]
  selectedBusinessLineId: string | null
}

/**
 * Transparent ranking algorithm for opportunities
 * Point-based scoring for deterministic ranking:
 * - Overdue next action: +1000 points
 * - No next action: +800 points
 * - URGENT priority: +400 points
 * - HIGH priority: +200 points
 * - MEDIUM priority: +100 points
 * - Stage weight: 0-600 points (later stages more important)
 * - Potential value: normalized to 0-100 points
 */
function rankOpportunity(
  opp: Opportunity,
  tasks: Task[],
  maxPotentialValue: number
): number {
  let score = 0

  // 1. Intervention urgency
  if (hasOverdueNextAction(opp.id, tasks)) {
    score += 1000
  } else if (hasNoNextAction(opp.id, tasks)) {
    score += 800
  }

  // 2. Priority
  switch (opp.priority) {
    case 'URGENT':
      score += 400
      break
    case 'HIGH':
      score += 200
      break
    case 'MEDIUM':
      score += 100
      break
  }

  // 3. Funnel advancement
  const stageWeights: Record<string, number> = {
    'Proposition': 600,
    'Opportunité': 500,
    'RDV': 400,
    'Qualifié': 300,
    'Échange': 200,
    'Contacté': 100,
    'À prospecter': 50,
  }
  score += stageWeights[opp.stage] || 0

  // 4. Potential value (normalized)
  if (maxPotentialValue > 0 && opp.potentialValue) {
    score += (opp.potentialValue / maxPotentialValue) * 100
  }

  return score
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} €`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TopOpportunities({
  opportunities,
  businessLines,
  companies,
  contacts,
  tasks,
  selectedBusinessLineId,
}: TopOpportunitiesProps) {
  // Filter by Business Line
  const filteredOpportunities = selectedBusinessLineId
    ? opportunities.filter((opp) => opp.businessLineId === selectedBusinessLineId)
    : opportunities

  // Active opportunities only
  const activeOpportunities = filteredOpportunities.filter(
    (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
  )

  // Calculate max potential value
  const maxPotentialValue = Math.max(
    ...activeOpportunities.map((opp) => opp.potentialValue || 0),
    1
  )

  // Rank and take top 5
  const topOpportunities = activeOpportunities
    .map((opp) => ({
      opp,
      score: rankOpportunity(opp, tasks, maxPotentialValue),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.opp)

  // Create lookup maps
  const blMap: Record<string, BusinessLine> = {}
  businessLines.forEach((bl) => {
    blMap[bl.id] = bl
  })

  const companyMap: Record<string, Company> = {}
  companies.forEach((c) => {
    companyMap[c.id] = c
  })

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-px w-7 bg-accent" />
        <h2 className="text-xs uppercase tracking-wide text-accent font-medium">
          Opportunités à suivre
        </h2>
      </div>

      {/* Dense Opportunities List */}
      <div className="bg-card-bg border border-border rounded-2xl overflow-hidden">
        {topOpportunities.length === 0 ? (
          <div className="p-6 text-text-muted text-sm">
            Aucune opportunité à suivre
          </div>
        ) : (
          <div className="divide-y divide-border">
            {topOpportunities.map((opp) => {
              const bl = blMap[opp.businessLineId]
              const company = opp.companyId ? companyMap[opp.companyId] : null
              const nextAction = getNextAction(opp.id, tasks)
              const isOverdue = hasOverdueNextAction(opp.id, tasks)
              const noAction = hasNoNextAction(opp.id, tasks)

              return (
                <Link
                  key={opp.id}
                  href={`/prospects/${opp.id}`}
                  className="block p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="space-y-2">
                    {/* Row 1: Name + Value */}
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-text-primary text-sm">
                        {opp.name || company?.name || 'Sans nom'}
                      </h3>
                      <span className="font-semibold font-syne text-text-primary text-sm whitespace-nowrap">
                        {formatCurrency(opp.potentialValue || 0)}
                      </span>
                    </div>

                    {/* Row 2: BL + Stage */}
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {bl && <span>{bl.name}</span>}
                      {bl && opp.stage && <span>·</span>}
                      {opp.stage && <span>{opp.stage}</span>}
                    </div>

                    {/* Row 3: Attention Reason / Next Action - PROMINENT */}
                    <div className="text-xs">
                      {isOverdue ? (
                        <span className="text-red-400 font-medium">
                          En retard
                        </span>
                      ) : noAction ? (
                        <span className="text-amber-400 font-medium">
                          Sans prochaine action
                        </span>
                      ) : nextAction ? (
                        <span className="text-text-muted">
                          Prochaine action : {getTaskTypeLabel(nextAction.type)}
                          {nextAction.dueAt && ` · ${formatDate(nextAction.dueAt)}`}
                        </span>
                      ) : null}
                    </div>

                    {/* Row 4: Owner */}
                    {opp.owner && (
                      <div className="text-xs text-text-muted">
                        {opp.owner}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
