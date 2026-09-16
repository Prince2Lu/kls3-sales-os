// Relationships to work section for Today page
// Displays actionable relationships needing attention

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RelationshipWithPriority } from '@/lib/relationships/scoring'
import { getMostUrgentSignal } from '@/lib/relationships/signals'
import { getDaysSinceLastInteraction } from '@/lib/relationships/signals'

interface RelationshipsSectionProps {
  relationships: RelationshipWithPriority[]
}

/**
 * Get French label for signal reason
 */
function getSignalReason(relationship: RelationshipWithPriority): string {
  const urgentSignal = getMostUrgentSignal(relationship.signals)

  if (!urgentSignal) return ''

  switch (urgentSignal) {
    case 'OVERDUE_ACTION':
      return 'Tâche en retard'
    case 'NO_NEXT_ACTION':
      return 'Aucune prochaine action'
    case 'DORMANT_CRITICAL': {
      const days = getDaysSinceLastInteraction(relationship)
      return days
        ? `Aucun contact depuis ${days} jours`
        : 'Aucun contact récent'
    }
    case 'DORMANT_WARNING': {
      const days = getDaysSinceLastInteraction(relationship)
      return days ? `Aucun contact depuis ${days} jours` : 'À relancer'
    }
    case 'HIGH_IMPORTANCE':
      return 'Relation importante à entretenir'
    case 'UPCOMING_ACTION':
      return 'Prochaine action cette semaine'
    default:
      return ''
  }
}

export function RelationshipsSection({
  relationships,
}: RelationshipsSectionProps) {
  if (relationships.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Relations à travailler</h2>
          <Badge variant="accent">{relationships.length}</Badge>
        </div>

        <div className="space-y-3">
          {relationships.map((relationship) => {
            const reason = getSignalReason(relationship)
            const daysSince = getDaysSinceLastInteraction(relationship)

            return (
              <Link
                key={relationship.id}
                href={`/relationships/${relationship.id}`}
                className="block p-3 rounded-lg hover:bg-white/5 transition-colors border border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium truncate">
                        {relationship.name}
                      </div>
                      <Badge variant="muted" className="text-xs shrink-0">
                        {relationship.relationshipType}
                      </Badge>
                      {relationship.importance === 'Haute' && (
                        <Badge variant="accent" className="text-xs shrink-0">
                          Important
                        </Badge>
                      )}
                    </div>

                    {reason && (
                      <div className="text-sm text-text-muted">{reason}</div>
                    )}

                    {relationship.lastInteraction && daysSince !== null && (
                      <div className="text-xs text-text-muted mt-1">
                        Dernière interaction:{' '}
                        {new Date(
                          relationship.lastInteraction
                        ).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-accent">
                      Score: {relationship.priorityScore}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href="/relationships"
            className="text-sm text-accent hover:underline"
          >
            Voir toutes les relations →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
