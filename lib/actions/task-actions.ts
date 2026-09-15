// Server actions for Task operations

'use server'

import { createTask } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { revalidatePath } from 'next/cache'
import type { TaskType, Priority } from '@/types/domain'

/**
 * Create a manual task
 * Links to either coldCallTargetId or opportunityId
 */
export async function createManualTask(data: {
  coldCallTargetId?: string
  opportunityId?: string
  contactId?: string
  type: TaskType
  dueAt: string
  priority: Priority
  notes?: string
}) {
  try {
    // Get owner server-side from session
    const owner = await getCurrentOwner()

    // Must have either coldCallTargetId or opportunityId
    if (!data.coldCallTargetId && !data.opportunityId) {
      return {
        success: false,
        error: 'coldCallTargetId or opportunityId required',
      }
    }

    // Create task with status TODO
    await createTask({
      coldCallTargetId: data.coldCallTargetId,
      opportunityId: data.opportunityId,
      contactId: data.contactId,
      type: data.type,
      dueAt: data.dueAt,
      priority: data.priority,
      status: 'TODO',
      notes: data.notes,
      owner,
    })

    // Revalidate relevant paths
    revalidatePath('/cold-call')
    revalidatePath('/pipeline')
    revalidatePath('/today')
    if (data.opportunityId) {
      revalidatePath(`/prospects/${data.opportunityId}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error creating manual task:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
