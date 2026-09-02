// Focus eligibility logic — SINGLE SOURCE OF TRUTH
// Determines which tasks are eligible for Focus Mode processing

import type { Task } from '@/types/domain'
import { isOverdue, isToday } from './date'

/**
 * Check if a task is eligible for Focus Mode
 *
 * Rules:
 * - Must be TODO status
 * - Must have dueAt
 * - Overdue tasks: always eligible
 * - Today non-meetings: always eligible
 * - Today meetings: only if within 2 hours of dueAt
 *
 * @param task - The task to check
 * @param now - Current time for meeting proximity check (optional, defaults to new Date())
 * @returns true if task is Focus-eligible
 */
export function isFocusEligible(task: Task, now?: Date): boolean {
  // Must be TODO with dueAt
  if (task.status !== 'TODO') return false
  if (!task.dueAt) return false

  // Overdue tasks are always eligible
  if (isOverdue(task.dueAt)) return true

  // Today's tasks are eligible, except future meetings
  if (isToday(task.dueAt)) {
    // For meetings, only include if near due time (exclude if >2 hours away)
    if (task.type === 'MEETING') {
      const dueDate = new Date(task.dueAt)
      const currentTime = now || new Date()
      const hoursUntilDue = (dueDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60)

      // Include if past due or within 2 hours
      return hoursUntilDue <= 2
    }

    // Non-meeting tasks due today are eligible
    return true
  }

  return false
}

/**
 * Filter an array of tasks to only Focus-eligible ones
 *
 * @param tasks - Array of tasks to filter
 * @param now - Current time for meeting proximity check (optional, defaults to new Date())
 * @returns Array of Focus-eligible tasks
 */
export function filterFocusEligible(tasks: Task[], now?: Date): Task[] {
  return tasks.filter((task) => isFocusEligible(task, now))
}
