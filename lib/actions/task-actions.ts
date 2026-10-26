// Server actions for Task operations

'use server'

import { createTask } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { revalidateCrmContext } from './crm-revalidation'
import type { TaskType, Priority } from '@/types/domain'

/**
 * Create a manual task
 * Links to a contact, prospecting target or opportunity
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

    // A contact is sufficient; planning must not require prospecting or an opportunity.
    if (!data.coldCallTargetId && !data.opportunityId && !data.contactId) {
      return {
        success: false,
        error: 'Choisissez un contact, une opportunité ou une cible de prospection.',
      }
    }

    if (!Number.isFinite(Date.parse(data.dueAt))) throw new Error('Échéance invalide.')
    if (!['CALL','EMAIL','LINKEDIN','MEETING','DEMO','PROPOSAL','DOCUMENT','FOLLOW_UP','OTHER'].includes(data.type)) throw new Error('Type de tâche invalide.')
    if (!['LOW','MEDIUM','HIGH','URGENT'].includes(data.priority)) throw new Error('Priorité invalide.')

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

    await revalidateCrmContext()

    return { success: true }
  } catch (error: any) {
    console.error('Error creating manual task:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
