// Compact Relationship card component for integrations (Phase 2)

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { RelationshipWithInteractions } from '@/lib/relationships/helpers'

interface RelationshipCardProps {
  relationship: RelationshipWithInteractions
  showContact?: boolean
}

export function RelationshipCard({
  relationship,
  showContact = false,
}: RelationshipCardProps) {
  const hasNextAction = relationship.nextActionTaskId !== null
  const isOverdue =
    relationship.nextActionDueAt &&
    new Date(relationship.nextActionDueAt) < new Date()

  return (
    <Link href={`/relationships/${relationship.id}`}>
      <div className="p-3 rounded-lg hover:bg-white/5 transition-colors border border-border">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{relationship.name}</div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="default" className="text-xs">
            {relationship.relationshipType}
          </Badge>
          <Badge
            variant={
              relationship.importance === 'Haute'
                ? 'accent'
                : relationship.importance === 'Faible'
                ? 'muted'
                : 'default'
            }
            className="text-xs"
          >
            {relationship.importance}
          </Badge>
          {relationship.status !== 'Actif' && (
            <Badge variant="muted" className="text-xs">
              {relationship.status}
            </Badge>
          )}
        </div>

        {/* Last Interaction */}
        {relationship.lastInteraction && (
          <div className="text-xs text-text-muted mb-2">
            Dernière interaction :{' '}
            {new Date(relationship.lastInteraction).toLocaleDateString('fr-FR')}
          </div>
        )}

        {/* Next Action */}
        {hasNextAction ? (
          <div className="flex items-center gap-2">
            <Badge
              variant={isOverdue ? 'muted' : 'accent'}
              className="text-xs"
            >
              Prochaine action
            </Badge>
            {relationship.nextActionDueAt && (
              <span
                className={`text-xs ${
                  isOverdue ? 'text-red-500' : 'text-text-muted'
                }`}
              >
                {new Date(relationship.nextActionDueAt).toLocaleDateString(
                  'fr-FR'
                )}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-text-muted">Aucune action planifiée</div>
        )}
      </div>
    </Link>
  )
}
