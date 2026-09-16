// Relationships list with filters and sorting (Phase 3)
// Client component for interactive filtering and sorting

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RelationshipWithPriority } from '@/lib/relationships/scoring'
import type { RelationshipHealth } from '@/lib/relationships/health'
import {
  getRelationshipHealth,
  getHealthBadgeVariant,
  getHealthLabel,
} from '@/lib/relationships/health'
import { hasSignal } from '@/lib/relationships/signals'
import { RelationshipFilters } from './relationship-filters'

interface RelationshipsListProps {
  relationships: RelationshipWithPriority[]
}

type SortBy = 'priority' | 'lastInteraction' | 'nextAction' | 'importance' | 'introducedCount'

export function RelationshipsList({ relationships }: RelationshipsListProps) {
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedImportance, setSelectedImportance] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedHealth, setSelectedHealth] = useState('all')
  const [selectedIntroducer, setSelectedIntroducer] = useState('all')
  const [sortBy, setSortBy] = useState<SortBy>('priority')

  // Apply filters and sorting
  const filtered = useMemo(() => {
    let result = [...relationships]

    // Filter by status
    if (selectedStatus !== 'all') {
      result = result.filter((r) => r.status === selectedStatus)
    }

    // Filter by importance
    if (selectedImportance !== 'all') {
      result = result.filter((r) => r.importance === selectedImportance)
    }

    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter((r) => r.relationshipType === selectedType)
    }

    // Filter by health
    if (selectedHealth !== 'all') {
      result = result.filter((r) => {
        const health = getRelationshipHealth(r)
        return health === selectedHealth
      })
    }

    // Filter by introducer
    if (selectedIntroducer === 'ACTIVE_INTRODUCER') {
      result = result.filter((r) => hasSignal(r.signals, 'ACTIVE_INTRODUCER'))
    } else if (selectedIntroducer === 'SUCCESSFUL_INTRODUCER') {
      result = result.filter((r) =>
        hasSignal(r.signals, 'SUCCESSFUL_INTRODUCER')
      )
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priorityScore - a.priorityScore

        case 'lastInteraction':
          if (!a.lastInteraction && !b.lastInteraction) return 0
          if (!a.lastInteraction) return 1
          if (!b.lastInteraction) return -1
          return (
            new Date(b.lastInteraction).getTime() -
            new Date(a.lastInteraction).getTime()
          )

        case 'nextAction':
          if (!a.nextActionDueAt && !b.nextActionDueAt) return 0
          if (!a.nextActionDueAt) return 1
          if (!b.nextActionDueAt) return -1
          return (
            new Date(a.nextActionDueAt).getTime() -
            new Date(b.nextActionDueAt).getTime()
          )

        case 'importance': {
          const importanceOrder = { Haute: 3, Normale: 2, Faible: 1 }
          return (
            importanceOrder[b.importance] - importanceOrder[a.importance]
          )
        }

        case 'introducedCount': {
          const aCount = relationships.filter((r) =>
            hasSignal(r.signals, 'ACTIVE_INTRODUCER')
          ).length
          const bCount = relationships.filter((r) =>
            hasSignal(r.signals, 'ACTIVE_INTRODUCER')
          ).length
          return bCount - aCount
        }

        default:
          return 0
      }
    })

    return result
  }, [
    relationships,
    selectedStatus,
    selectedImportance,
    selectedType,
    selectedHealth,
    selectedIntroducer,
    sortBy,
  ])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <RelationshipFilters
        selectedStatus={selectedStatus}
        selectedImportance={selectedImportance}
        selectedType={selectedType}
        selectedHealth={selectedHealth}
        selectedIntroducer={selectedIntroducer}
        onStatusChange={setSelectedStatus}
        onImportanceChange={setSelectedImportance}
        onTypeChange={setSelectedType}
        onHealthChange={setSelectedHealth}
        onIntroducerChange={setSelectedIntroducer}
      />

      {/* Sorting */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">Trier par :</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSortBy('priority')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              sortBy === 'priority'
                ? 'bg-accent text-white'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Priorité
          </button>
          <button
            onClick={() => setSortBy('lastInteraction')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              sortBy === 'lastInteraction'
                ? 'bg-accent text-white'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Dernière interaction
          </button>
          <button
            onClick={() => setSortBy('nextAction')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              sortBy === 'nextAction'
                ? 'bg-accent text-white'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Prochaine action
          </button>
          <button
            onClick={() => setSortBy('importance')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              sortBy === 'importance'
                ? 'bg-accent text-white'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Importance
          </button>
        </div>
        <span className="text-sm text-text-muted ml-auto">
          {filtered.length} relation{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-text-muted">
            Aucune relation ne correspond aux filtres sélectionnés
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((relationship) => {
            const health = getRelationshipHealth(relationship)

            return (
              <Link key={relationship.id} href={`/relationships/${relationship.id}`}>
                <Card className="hover:bg-white/5 transition-colors h-full">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="font-medium mb-1">{relationship.name}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="accent" className="text-xs">
                          {relationship.relationshipType}
                        </Badge>
                        <Badge variant="muted" className="text-xs">
                          {relationship.importance}
                        </Badge>
                        <Badge
                          variant={getHealthBadgeVariant(health)}
                          className="text-xs"
                        >
                          {getHealthLabel(health)}
                        </Badge>
                      </div>
                    </div>

                    {relationship.lastInteraction ? (
                      <div className="text-xs text-text-muted">
                        Dernière interaction :{' '}
                        {new Date(relationship.lastInteraction).toLocaleDateString(
                          'fr-FR',
                          { day: 'numeric', month: 'short' }
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted">
                        Aucune activité enregistrée
                      </div>
                    )}

                    {relationship.nextActionTaskId ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="accent" className="text-xs">
                          Prochaine action
                        </Badge>
                        {relationship.nextActionDueAt && (
                          <span className="text-xs text-text-muted">
                            {new Date(relationship.nextActionDueAt).toLocaleDateString(
                              'fr-FR',
                              { day: 'numeric', month: 'short' }
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted">
                        Aucune prochaine action
                      </div>
                    )}

                    <div className="pt-2 border-t border-border text-xs text-accent font-medium">
                      Score de priorité : {relationship.priorityScore}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
