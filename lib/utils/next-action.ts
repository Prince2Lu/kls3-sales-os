// Next Action utilities for opportunities
// Source of truth: earliest open TODO task

import type { Task } from '@/types/domain'

/**
 * Get the next action (earliest TODO task) for an opportunity
 * Returns null if no TODO tasks exist
 */
export function getNextAction(opportunityId: string, tasks: Task[]): Task | null {
  const oppTasks = tasks
    .filter((t) => t.opportunityId === opportunityId && t.status === 'TODO')
    .sort((a, b) => {
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })

  return oppTasks[0] || null
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueAt) return false
  const now = new Date()
  const dueDate = new Date(task.dueAt)
  return dueDate < now
}

/**
 * Check if an opportunity has an overdue next action
 */
export function hasOverdueNextAction(opportunityId: string, tasks: Task[]): boolean {
  const nextAction = getNextAction(opportunityId, tasks)
  if (!nextAction) return false
  return isTaskOverdue(nextAction)
}

/**
 * Check if an opportunity has no next action (no TODO tasks)
 */
export function hasNoNextAction(opportunityId: string, tasks: Task[]): boolean {
  return getNextAction(opportunityId, tasks) === null
}
