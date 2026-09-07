// Edit task (workflow enhancement)

import { getTaskById, getOpportunityById } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { TaskEditForm } from './task-edit-form'
import { notFound } from 'next/navigation'

interface EditTaskPageProps {
  params: Promise<{ id: string; taskId: string }>
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { id, taskId } = await params
  const currentOwner = await getCurrentOwner()

  try {
    const [task, opportunity] = await Promise.all([
      getTaskById(taskId),
      getOpportunityById(id),
    ])

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-syne">Modifier la tâche</h1>
          <p className="text-text-muted mt-2">{opportunity.name}</p>
        </div>

        <TaskEditForm
          taskId={taskId}
          opportunityId={id}
          task={task}
          currentOwner={currentOwner}
        />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
