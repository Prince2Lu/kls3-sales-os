// Relationships list page (Phase 2 + Phase 3)

import { getRelationships, getActivities, getTasks, getOpportunities } from '@/lib/airtable'
import { enrichRelationshipsWithInteractions } from '@/lib/relationships/helpers'
import { enrichWithPriority } from '@/lib/relationships/scoring'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { RelationshipsList } from './relationships-list'

export default async function RelationshipsPage() {
  // Load relationships with related data
  const [relationships, activities, tasks, opportunities] = await Promise.all([
    getRelationships({ maxRecords: 1000 }),
    getActivities({ maxRecords: 10000 }),
    getTasks({ maxRecords: 10000 }),
    getOpportunities({ maxRecords: 1000 }),
  ])

  // Enrich with last interaction and next action
  const enriched = enrichRelationshipsWithInteractions(
    relationships,
    activities,
    tasks
  )

  // Enrich with priority scores and signals (Phase 3)
  const enrichedWithPriority = enrichWithPriority(enriched, opportunities)

  // Group by status
  const activeRelationships = enrichedWithPriority.filter(r => r.status === 'Actif')
  const plannedRelationships = enrichedWithPriority.filter(r => r.status === 'Action prévue' || r.status === 'En discussion')
  const toActivateRelationships = enrichedWithPriority.filter(r => r.status === 'À activer')
  const dormantRelationships = enrichedWithPriority.filter(r => r.status === 'Dormant')
  const closedRelationships = enrichedWithPriority.filter(r => r.status === 'Clos')

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
              {enrichedWithPriority.filter(r => r.importance === 'Haute').length}
            </div>
            <div className="text-sm text-text-muted">Haute importance</div>
          </CardContent>
        </Card>
      </div>

      {/* Filterable list (Phase 3) */}
      <RelationshipsList relationships={enrichedWithPriority} />

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
