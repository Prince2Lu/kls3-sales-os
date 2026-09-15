'use client'

// Shared component for displaying task summary

import type { Task } from '@/types/domain'

interface TaskSummaryProps {
  tasks: Task[]
  compact?: boolean
}

export function TaskSummary({ tasks, compact = false }: TaskSummaryProps) {
  // Only count TODO tasks
  const openTasks = tasks.filter((t) => t.status === 'TODO')

  if (openTasks.length === 0) return null

  // Find next task (earliest dueAt)
  const nextTask = openTasks
    .filter((t) => t.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())[0]

  const overdueCount = openTasks.filter((t) => {
    if (!t.dueAt) return false
    return new Date(t.dueAt) < new Date()
  }).length

  if (compact) {
    return (
      <span className="text-xs text-text-muted">
        {overdueCount > 0 ? '🔴' : '📋'} {openTasks.length}
      </span>
    )
  }

  return (
    <div className="text-xs space-y-1">
      {nextTask && (
        <div className={overdueCount > 0 ? 'text-red-400' : 'text-text-muted'}>
          → {nextTask.type}
          {nextTask.dueAt && (
            <span className="ml-1">
              {new Date(nextTask.dueAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )}
        </div>
      )}

      {openTasks.length > 1 && (
        <div className="text-text-muted/60">
          +{openTasks.length - 1} autre{openTasks.length - 1 > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
