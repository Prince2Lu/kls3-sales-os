// Server actions for Call operations (shared between cold-call and pipeline)

'use server'

import { createActivity } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { revalidatePath } from 'next/cache'
import type { ActivityResult } from '@/types/domain'

/**
 * Record a call activity on an Opportunity
 * Creates ACTIVITY with type CALL
 */
export async function recordOpportunityCallActivity(
  opportunityId: string,
  result: ActivityResult,
  contactId?: string
) {
  try {
    // Get owner server-side from session
    const owner = await getCurrentOwner()

    // Create Activity
    await createActivity({
      opportunityId,
      contactId: contactId || undefined,
      type: 'CALL',
      date: new Date().toISOString(),
      result,
      owner,
    })

    // Revalidate relevant paths
    revalidatePath('/pipeline')
    revalidatePath('/today')
    revalidatePath(`/prospects/${opportunityId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Error recording opportunity call activity:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
