// Edit Relationship page (Phase 2)

import {
  getRelationshipById,
  getCompanies,
  getContacts,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { RelationshipForm } from '../../relationship-form'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface EditRelationshipPageProps {
  params: Promise<{ id: string }>
}

export default async function EditRelationshipPage({
  params,
}: EditRelationshipPageProps) {
  const { id } = await params

  try {
    const [relationship, companies, contacts, currentOwner] = await Promise.all([
      getRelationshipById(id),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getCurrentOwner(),
    ])

    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/relationships/${id}`}
              className="text-text-muted hover:text-text-primary text-sm"
            >
              ← {relationship.name}
            </Link>
          </div>
          <h1 className="text-4xl font-bold font-syne">Modifier la relation</h1>
        </div>

        {/* Form */}
        <RelationshipForm
          companies={companies}
          contacts={contacts}
          currentOwner={currentOwner}
          relationship={relationship}
          mode="edit"
        />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
