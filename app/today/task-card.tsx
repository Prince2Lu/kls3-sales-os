'use client'

// Task card component for today page (Phase 4)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Task, BusinessLine } from '@/types/domain'
import { formatFrenchTime, formatOverdueDisplay } from '@/lib/utils/date'
import { getFrenchTaskType, getFrenchPriority } from '@/lib/utils/french-labels'
import { completeTaskAction, cancelTaskAction } from './actions'

interface TaskCardProps {
  task: Task
  businessLine?: BusinessLine
  opportunityName?: string
  companyName?: string
  contactName?: string
  isOverdue?: boolean
}

export function TaskCard({
  task,
  businessLine,
  opportunityName,
  companyName,
  contactName,
  isOverdue = false,
}: TaskCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  async function handleComplete() {
    setIsCompleting(true)
    startTransition(async () => {
      await completeTaskAction(task.id)
      router.refresh()
      setIsCompleting(false)
    })
  }

  async function handleCancel() {
    setIsCancelling(true)
    startTransition(async () => {
      await cancelTaskAction(task.id)
      router.refresh()
      setIsCancelling(false)
    })
  }

  const taskTime = task.dueAt ? new Date(task.dueAt) : null
  const timeDisplay = isOverdue && task.dueAt
    ? formatOverdueDisplay(task.dueAt)
    : taskTime
    ? formatFrenchTime(taskTime)
    : null

  return (
    <Card
      className={`p-3 hover:border-accent/20 transition-colors ${
        isOverdue ? 'border-red-500/30 bg-red-500/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Main content - flexible */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* First line: Type, priority, time */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-medium text-text-primary">
              {getFrenchTaskType(task.type)}
            </span>
            {task.priority && (task.priority === 'URGENT' || task.priority === 'HIGH') && (
              <>
                <span className="text-text-muted">•</span>
                <span className={`text-xs ${task.priority === 'URGENT' ? 'text-red-500' : 'text-accent'}`}>
                  {getFrenchPriority(task.priority)}
                </span>
              </>
            )}
            {businessLine && (
              <>
                <span className="text-text-muted">•</span>
                <span className="text-xs text-text-muted">{businessLine.name}</span>
              </>
            )}
          </div>

          {/* Second line: Time display (with overdue formatting if applicable) */}
          {timeDisplay && (
            <div className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-text-muted'}`}>
              {timeDisplay}
            </div>
          )}

          {/* Third line: Opportunity link */}
          {opportunityName && (
            <div>
              <Link
                href={`/prospects/${task.opportunityId}`}
                className="text-accent hover:underline text-sm"
              >
                {opportunityName}
              </Link>
              {companyName && (
                <span className="text-text-muted text-xs ml-2">
                  · {companyName}
                </span>
              )}
            </div>
          )}

          {/* Fourth line: Notes (if present) */}
          {task.notes && (
            <div className="text-sm text-text-muted line-clamp-2">
              {task.notes}
            </div>
          )}
        </div>

        {/* Actions - compact buttons */}
        <div className="flex gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={isPending}
            className="text-xs h-7 px-2"
            title="Marquer terminé"
          >
            ✓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
            className="text-xs h-7 px-2 opacity-60 hover:opacity-100"
            title="Annuler"
          >
            ✕
          </Button>
        </div>
      </div>
    </Card>
  )
}
