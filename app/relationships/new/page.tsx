// Create new Relationship page (Phase 2)

import { getCompanies, getContacts } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { RelationshipForm } from '../relationship-form'
import Link from 'next/link'

interface NewRelationshipPageProps {
  searchParams: Promise<{ companyId?: string; contactId?: string }>
}

export default async function NewRelationshipPage({
  searchParams,
}: NewRelationshipPageProps) {
  const params = await searchParams
  const [companies, contacts, currentOwner] = await Promise.all([
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
            href="/relationships"
            className="text-text-muted hover:text-text-primary text-sm"
          >
            ← Relations stratégiques
          </Link>
        </div>
        <h1 className="text-4xl font-bold font-syne">Nouvelle relation</h1>
        <p className="text-text-muted mt-2">
          Créer une relation stratégique pour le développement commercial
        </p>
      </div>

      {/* Form */}
      <RelationshipForm
        companies={companies}
        contacts={contacts}
        currentOwner={currentOwner}
        defaultCompanyId={params.companyId}
        defaultContactId={params.contactId}
        mode="create"
      />
    </div>
  )
}
