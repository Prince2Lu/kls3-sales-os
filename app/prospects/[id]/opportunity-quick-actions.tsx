'use client'

// + Activité / + Tâche on the Opportunity page without leaving it (Trello #60).
// Same modals and server validations as Company, Contact and Prospection:
// an Activity is something done (past), a Task something to do (future).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateActivityModal } from '@/components/pipeline/create-activity-modal'
import { CreateTaskModal } from '@/components/pipeline/create-task-modal'
import { createManualTask } from '@/lib/actions/task-actions'

export function OpportunityQuickActions({ opportunityId, contactId }: { opportunityId: string; contactId: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState<'activity' | 'task' | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>()

  async function createTask(data: { type: import('@/types/domain').TaskType; dueAt: string; priority: import('@/types/domain').Priority; notes?: string }) {
    setPending(true)
    setError(undefined)
    const response = await createManualTask({ opportunityId, contactId: contactId || undefined, ...data })
    setPending(false)
    if (!response.success) { setError(response.error || 'Impossible de créer la tâche.'); return }
    setOpen(null)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen('activity')}>+ Activité</Button>
      <Button size="sm" variant="ghost" onClick={() => { setError(undefined); setOpen('task') }}>+ Tâche</Button>

      {open === 'activity' && (
        <CreateActivityModal
          opportunityId={opportunityId}
          contactId={contactId || undefined}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'task' && (
        <CreateTaskModal
          onConfirm={createTask}
          onCancel={() => setOpen(null)}
          pending={pending}
          error={error}
        />
      )}
    </>
  )
}
