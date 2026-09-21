// Create new activity for a Relationship

import { getRelationshipById, getContactById } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { ActivityForm } from './activity-form'
import { notFound } from 'next/navigation'

interface NewRelationshipActivityPageProps {
  params: Promise<{ id: string }>
}

export default async function NewRelationshipActivityPage({
  params,
}: NewRelationshipActivityPageProps) {
  const { id } = await params
  const currentOwner = await getCurrentOwner()

  try {
    const relationship = await getRelationshipById(id)

    // Get contact if linked to relationship
    const contact = relationship.contactId
      ? await getContactById(relationship.contactId).catch(() => null)
      : null

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-syne">Ajouter une activité</h1>
          <p className="text-text-muted mt-2">{relationship.name}</p>
        </div>

        <ActivityForm
          relationshipId={id}
          contactId={contact?.id}
          currentOwner={currentOwner}
        />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
