// Relationships list page with improved UX

import { getRelationships, getActivities, getTasks, getOpportunities, getContacts, getCompanies } from '@/lib/airtable'
import { enrichRelationshipsWithInteractions } from '@/lib/relationships/helpers'
import { enrichWithPriority } from '@/lib/relationships/scoring'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RelationshipsClient } from './relationships-client'

export default async function RelationshipsPage() {
  // Load relationships with related data
  const [relationships, activities, tasks, opportunities, contacts, companies] = await Promise.all([
    getRelationships({ maxRecords: 1000 }),
    getActivities({ maxRecords: 10000 }),
    getTasks({ maxRecords: 10000 }),
    getOpportunities({ maxRecords: 1000 }),
    getContacts({ maxRecords: 1000 }),
    getCompanies({ maxRecords: 1000 }),
  ])

  // Enrich with last interaction and next action
  const enriched = enrichRelationshipsWithInteractions(
    relationships,
    activities,
    tasks
  )

  // Enrich with priority scores and signals (Phase 3)
  const enrichedWithPriority = enrichWithPriority(enriched, opportunities)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Relations stratégiques</h1>
        </div>
        <Link href="/relationships/new">
          <Button>+ Nouvelle relation</Button>
        </Link>
      </div>

      {/* Client-side list with search, filters, view toggle */}
      <RelationshipsClient
        relationships={enrichedWithPriority}
        contacts={contacts}
        companies={companies}
      />
    </div>
  )
}
