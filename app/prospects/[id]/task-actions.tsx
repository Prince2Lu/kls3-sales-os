'use client'

// Task action buttons (Phase 2.5)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { completeTaskAction, cancelTaskAction } from '../actions'

interface TaskActionsProps {
  taskId: string
  status: string
}

export function TaskActions({ taskId, status }: TaskActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (status !== 'TODO') {
    return null
  }

  async function handleComplete() {
    startTransition(async () => {
      await completeTaskAction(taskId)
      router.refresh()
    })
  }

  async function handleCancel() {
    startTransition(async () => {
      await cancelTaskAction(taskId)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2 mt-2">
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
