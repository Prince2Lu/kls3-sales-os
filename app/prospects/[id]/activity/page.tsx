// Record new activity (Phase 2.5)

import { getOpportunityById, getContactById } from '@/lib/airtable'
import { ActivityForm } from './activity-form'
import { notFound } from 'next/navigation'

interface NewActivityPageProps {
  params: Promise<{ id: string }>
}

export default async function NewActivityPage({
  params,
}: NewActivityPageProps) {
  const { id } = await params

  try {
    const opportunity = await getOpportunityById(id)
    const contact = opportunity.primaryContactId
      ? await getContactById(opportunity.primaryContactId).catch(() => null)
      : null

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-syne">Enregistrer une activité</h1>
          <p className="text-text-muted mt-2">{opportunity.name}</p>
        </div>

        <ActivityForm opportunityId={id} contactId={contact?.id} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
