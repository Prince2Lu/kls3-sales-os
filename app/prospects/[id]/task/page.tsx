// Create new task (Phase 2.5)

import { getOpportunityById, getContactById } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { TaskForm } from './task-form'
import { notFound } from 'next/navigation'

interface NewTaskPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ contactId?: string }>
}

export default async function NewTaskPage({
  params,
  searchParams,
}: NewTaskPageProps) {
  const { id } = await params
  const search = await searchParams
  const currentOwner = await getCurrentOwner()

  try {
    const opportunity = await getOpportunityById(id)

    // Use contactId from query params (from activity) or fall back to primary contact
    const contactId = search.contactId || opportunity.primaryContactId
    const contact = contactId
      ? await getContactById(contactId).catch(() => null)
      : null

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-syne">Créer une tâche</h1>
          <p className="text-text-muted mt-2">{opportunity.name}</p>
        </div>

        <TaskForm
          opportunityId={id}
          contactId={contact?.id}
          currentOwner={currentOwner}
        />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
