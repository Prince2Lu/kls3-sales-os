// Record new activity (Phase 2.5 + workflow enhancement)

import { getOpportunityById, getContactById } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { ActivityForm } from './activity-form'
import { notFound } from 'next/navigation'

interface NewActivityPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; taskId?: string; contactId?: string }>
}

export default async function NewActivityPage({
  params,
  searchParams,
}: NewActivityPageProps) {
  const { id } = await params
  const search = await searchParams
  const currentOwner = await getCurrentOwner()

  try {
    const opportunity = await getOpportunityById(id)

    // Use contactId from query params (from task) or fall back to primary contact
    const contactId = search.contactId || opportunity.primaryContactId
    const contact = contactId
      ? await getContactById(contactId).catch(() => null)
      : null

    // Determine if this is from a CALL task
    const isFromCallTask = search.from === 'task'
    const taskId = search.taskId

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-syne">
            {isFromCallTask ? 'Enregistrer l\'appel' : 'Enregistrer une activité'}
          </h1>
          <p className="text-text-muted mt-2">{opportunity.name}</p>
        </div>

        <ActivityForm
          opportunityId={id}
          contactId={contact?.id}
          currentOwner={currentOwner}
          defaultType={isFromCallTask ? 'CALL' : undefined}
          taskId={taskId}
        />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
