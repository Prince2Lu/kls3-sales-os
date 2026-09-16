// Helpers for enriching Relationships with derived data
// O(R+A+T) complexity - single pass over Activities and Tasks

import type { Relationship, Activity, Task } from '@/types/domain'

export interface RelationshipWithInteractions extends Relationship {
  lastInteraction: string | null // ISO date from most recent Activity
  nextActionTaskId: string | null // ID of the next TODO Task
  nextActionDueAt: string | null // Due date of next TODO Task
}

/**
 * Enriches Relationships with Last Interaction and Next Action
 *
 * Complexity: O(R+A+T)
 * - Single pass over Activities to build lastActivityByRelationshipId Map
 * - Single pass over Tasks to build nextOpenTaskByRelationshipId Map
 * - Single pass over Relationships to enrich with lookups
 *
 * Rules:
 * - Last Interaction: Most recent Activity.date (Activities only, NOT Tasks)
 * - Next Action: Earliest Task with status='TODO'
 *   - Dated tasks (with dueAt) prioritized over undated tasks
 *   - Among dated tasks, earliest dueAt wins
 *   - Among undated tasks, earliest createdAt wins
 */
export function enrichRelationshipsWithInteractions(
  relationships: Relationship[],
  activities: Activity[],
  tasks: Task[]
): RelationshipWithInteractions[] {
  // ========================================================================
  // STEP 1: Build lastActivityByRelationshipId Map
  // O(A) - single pass over all Activities
  // ========================================================================
  const lastActivityByRelationshipId = new Map<string, string>()

  for (const activity of activities) {
    if (!activity.relationshipId) continue

    const existingDate = lastActivityByRelationshipId.get(activity.relationshipId)

    // Keep the most recent date
    if (!existingDate || activity.date > existingDate) {
      lastActivityByRelationshipId.set(activity.relationshipId, activity.date)
    }
  }

  // ========================================================================
  // STEP 2: Build nextOpenTaskByRelationshipId Map
  // O(T) - single pass over all Tasks
  // ========================================================================
  const nextOpenTaskByRelationshipId = new Map<
    string,
    { taskId: string; dueAt: string | null; createdAt: string }
  >()

  for (const task of tasks) {
    if (!task.relationshipId) continue
    if (task.status !== 'TODO') continue

    const existing = nextOpenTaskByRelationshipId.get(task.relationshipId)

    // Determine if this task should replace the existing one
    let shouldReplace = false

    if (!existing) {
      shouldReplace = true
    } else {
      // Priority rules:
      // 1. Dated tasks before undated tasks
      // 2. Among dated: earliest dueAt
      // 3. Among undated: earliest createdAt

      const taskHasDueAt = task.dueAt !== null
      const existingHasDueAt = existing.dueAt !== null

      if (taskHasDueAt && !existingHasDueAt) {
        // Task is dated, existing is undated → replace
        shouldReplace = true
      } else if (!taskHasDueAt && existingHasDueAt) {
        // Task is undated, existing is dated → keep existing
        shouldReplace = false
      } else if (taskHasDueAt && existingHasDueAt) {
        // Both dated → earliest dueAt wins
        shouldReplace = task.dueAt! < existing.dueAt!
      } else {
        // Both undated → earliest createdAt wins
        shouldReplace = task.createdAt < existing.createdAt
      }
    }

    if (shouldReplace) {
      nextOpenTaskByRelationshipId.set(task.relationshipId, {
        taskId: task.id,
        dueAt: task.dueAt,
        createdAt: task.createdAt,
      })
    }
  }

  // ========================================================================
  // STEP 3: Enrich Relationships with direct Map lookups
  // O(R) - single pass over Relationships
  // ========================================================================
  return relationships.map((relationship) => {
    const lastInteraction = lastActivityByRelationshipId.get(relationship.id) ?? null
    const nextAction = nextOpenTaskByRelationshipId.get(relationship.id)

    return {
      ...relationship,
      lastInteraction,
      nextActionTaskId: nextAction?.taskId ?? null,
      nextActionDueAt: nextAction?.dueAt ?? null,
    }
  })
}

/**
 * Filters Relationships that have no Next Action (no TODO Tasks)
 * Useful for identifying dormant relationships that need attention
 */
export function getRelationshipsWithoutNextAction(
  relationships: RelationshipWithInteractions[]
): RelationshipWithInteractions[] {
  return relationships.filter((r) => r.nextActionTaskId === null)
}

/**
 * Filters Relationships with overdue Next Actions
 * Useful for identifying relationships that need immediate attention
 */
export function getRelationshipsWithOverdueActions(
  relationships: RelationshipWithInteractions[]
): RelationshipWithInteractions[] {
  const now = new Date().toISOString()

  return relationships.filter((r) => {
    if (!r.nextActionDueAt) return false
    return r.nextActionDueAt < now
  })
}
