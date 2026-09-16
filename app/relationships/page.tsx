// Relationships list page (Phase 2)

import { getRelationships, getActivities, getTasks } from '@/lib/airtable'
import { enrichRelationshipsWithInteractions } from '@/lib/relationships/helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function RelationshipsPage() {
  // Load relationships with related data
  const [relationships, activities, tasks] = await Promise.all([
    getRelationships({ maxRecords: 1000 }),
    getActivities({ maxRecords: 10000 }),
    getTasks({ maxRecords: 10000 }),
  ])

  // Enrich with last interaction and next action
  const enriched = enrichRelationshipsWithInteractions(
    relationships,
    activities,
    tasks
  )

  // Group by status
  const activeRelationships = enriched.filter(r => r.status === 'Actif')
  const plannedRelationships = enriched.filter(r => r.status === 'Action prévue' || r.status === 'En discussion')
  const toActivateRelationships = enriched.filter(r => r.status === 'À activer')
  const dormantRelationships = enriched.filter(r => r.status === 'Dormant')
  const closedRelationships = enriched.filter(r => r.status === 'Clos')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Relations stratégiques</h1>
          <p className="text-text-muted mt-2">
            {enriched.length} relation{enriched.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <Link href="/relationships/new">
          <Button>+ Nouvelle relation</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-syne">
              {activeRelationships.length}
            </div>
            <div className="text-sm text-text-muted">Actives</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-syne">
              {plannedRelationships.length}
            </div>
            <div className="text-sm text-text-muted">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-syne">
              {toActivateRelationships.length}
            </div>
            <div className="text-sm text-text-muted">À activer</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-syne">
              {dormantRelationships.length}
            </div>
            <div className="text-sm text-text-muted">Dormantes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold font-syne">
              {enriched.filter(r => r.importance === 'Haute').length}
            </div>
            <div className="text-sm text-text-muted">Haute importance</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Relationships */}
      {activeRelationships.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold font-syne mb-4">Actives</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeRelationships.map((relationship) => (
              <Link key={relationship.id} href={`/relationships/${relationship.id}`}>
                <Card className="hover:bg-white/5 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="font-medium">{relationship.name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default">{relationship.relationshipType}</Badge>
                        <Badge
                          variant={
                            relationship.importance === 'Haute'
                              ? 'accent'
                              : relationship.importance === 'Faible'
                              ? 'muted'
                              : 'default'
                          }
                        >
                          {relationship.importance}
                        </Badge>
                      </div>
                    </div>

                    {/* Last Interaction */}
                    {relationship.lastInteraction && (
                      <div className="text-sm text-text-muted">
                        Dernière interaction :{' '}
                        {new Date(relationship.lastInteraction).toLocaleDateString('fr-FR')}
                      </div>
                    )}

                    {/* Next Action */}
                    {relationship.nextActionTaskId ? (
                      <div className="text-sm">
                        <Badge variant="accent" className="text-xs">Prochaine action</Badge>
                        {relationship.nextActionDueAt && (
                          <span className="text-text-muted ml-2">
                            {new Date(relationship.nextActionDueAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-text-muted">
                        Aucune action planifiée
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Planned Relationships */}
      {plannedRelationships.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold font-syne mb-4">En cours d'activation</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plannedRelationships.map((relationship) => (
              <Link key={relationship.id} href={`/relationships/${relationship.id}`}>
                <Card className="hover:bg-white/5 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="font-medium">{relationship.name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default">{relationship.relationshipType}</Badge>
                        <Badge variant="accent">{relationship.status}</Badge>
                      </div>
                    </div>

                    {relationship.objective && (
                      <div className="text-sm text-text-muted line-clamp-2">
                        {relationship.objective}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* To Activate */}
      {toActivateRelationships.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold font-syne mb-4">À activer</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {toActivateRelationships.map((relationship) => (
              <Link key={relationship.id} href={`/relationships/${relationship.id}`}>
                <Card className="hover:bg-white/5 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="font-medium">{relationship.name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="muted">{relationship.relationshipType}</Badge>
                        <Badge variant="muted">{relationship.importance}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dormant */}
      {dormantRelationships.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-2xl font-bold font-syne mb-4 flex items-center gap-2">
            Dormantes ({dormantRelationships.length})
            <span className="text-text-muted text-sm group-open:rotate-90 transition-transform">
              ▶
            </span>
          </summary>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {dormantRelationships.map((relationship) => (
              <Link key={relationship.id} href={`/relationships/${relationship.id}`}>
                <Card className="hover:bg-white/5 transition-colors opacity-60">
                  <CardContent className="p-4">
                    <div className="font-medium">{relationship.name}</div>
                    <Badge variant="muted" className="mt-2">{relationship.relationshipType}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </details>
      )}

      {/* Empty State */}
      {enriched.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-text-muted mb-4">
              Aucune relation stratégique créée pour le moment
            </div>
            <Link href="/relationships/new">
              <Button>+ Créer la première relation</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
