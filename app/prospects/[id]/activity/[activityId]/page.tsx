// Edit activity (workflow enhancement)

import { getActivityById, getOpportunityById } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { ActivityEditForm } from './activity-edit-form'
import { notFound } from 'next/navigation'

interface EditActivityPageProps {
  params: Promise<{ id: string; activityId: string }>
}

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const { id, activityId } = await params
  const currentOwner = await getCurrentOwner()

  try {
    const [activity, opportunity] = await Promise.all([
      getActivityById(activityId),
      getOpportunityById(id),
    ])

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-syne">Modifier l'activité</h1>
          <p className="text-text-muted mt-2">{opportunity.name}</p>
        </div>

        <ActivityEditForm
          activityId={activityId}
          opportunityId={id}
          activity={activity}
          currentOwner={currentOwner}
        />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
