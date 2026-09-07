'use client'

// Task action buttons (Phase 2.5 + workflow enhancement)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { completeTaskAction, cancelTaskAction } from '../actions'
import type { Task } from '@/types/domain'

interface TaskActionsProps {
  opportunityId: string
  task: Task
}

export function TaskActions({ opportunityId, task }: TaskActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleComplete() {
    startTransition(async () => {
      await completeTaskAction(task.id)
      router.refresh()
    })
  }

  async function handleCancel() {
    startTransition(async () => {
      await cancelTaskAction(task.id)
      router.refresh()
    })
  }

  // For completed/cancelled tasks, show minimal actions
  if (task.status !== 'TODO') {
    return (
      <div className="flex gap-2 mt-2">
        <Link
          href={`/prospects/${opportunityId}/task/${task.id}`}
          className="inline-block"
        >
          <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
            Modifier
          </Button>
        </Link>
      </div>
    )
  }

  // For TODO tasks, show all actions
  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      <Link
        href={`/prospects/${opportunityId}/task/${task.id}`}
        className="inline-block"
      >
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
          Modifier
        </Button>
      </Link>
      {task.type === 'CALL' && (
        <Link
          href={`/prospects/${opportunityId}/activity?from=task&taskId=${task.id}&contactId=${task.contactId || ''}`}
          className="inline-block"
        >
          <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
            Enregistrer l'appel
          </Button>
        </Link>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleComplete}
        disabled={isPending}
        className="text-xs h-7 px-2"
      >
        Marquer terminé
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCancel}
        disabled={isPending}
        className="text-xs h-7 px-2 text-text-muted"
      >
        Annuler
      </Button>
    </div>
  )
}
