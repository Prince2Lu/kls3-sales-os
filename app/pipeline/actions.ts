// Server actions for Pipeline operations (Phase 3)

'use server'

import {
  updateOpportunity,
  createStageHistory,
  getOpportunityById,
} from '@/lib/airtable'
import { revalidatePath } from 'next/cache'
import type { Stage } from '@/types/domain'

export async function updateOpportunityStage(
  opportunityId: string,
  newStage: Stage,
  changedBy: string
) {
  try {
    // Get current opportunity to track previous stage
    const currentOpportunity = await getOpportunityById(opportunityId)
    const previousStage = currentOpportunity.stage

    // Update opportunity stage and timestamps
    const updates: Record<string, any> = {
      stage: newStage,
    }

    if (newStage === 'Gagné') {
      updates.wonAt = new Date().toISOString()
    } else if (newStage === 'Perdu') {
      updates.lostAt = new Date().toISOString()
    }

    await updateOpportunity(opportunityId, updates)

    // Create stage history entry
    await createStageHistory({
      opportunityId,
      fromStage: previousStage,
      toStage: newStage,
      changedBy,
    })

    revalidatePath('/pipeline')
    revalidatePath(`/prospects/${opportunityId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to update opportunity stage:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
