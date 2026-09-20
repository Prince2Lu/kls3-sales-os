// Server actions for Cold Call operations

'use server'

import {
  updateColdCallTarget,
  getColdCallTargetById,
  createTask,
  createOpportunity,
  getOpportunities,
  updateOpportunity,
  createStageHistory,
  createActivity,
} from '@/lib/airtable'
import { changeColdCallStatus } from '@/lib/cold-call/status-manager'
import { revalidatePath } from 'next/cache'
import type { CallStatus, Stage, ActivityResult, Owner } from '@/types/domain'

/**
 * Update cold call target status
 * Handles business logic for each status transition
 */
export async function updateColdCallStatus(
  targetId: string,
  newStatus: CallStatus,
  metadata?: {
    callbackDate?: string // For "Relance prévue"
  }
) {
  try {
    // Get changedBy server-side from session for STAGE_HISTORY
    const { getCurrentOwner } = await import('@/lib/utils/current-owner')
    const changedBy = await getCurrentOwner()

    const target = await getColdCallTargetById(targetId)

    // Use centralized status change function (with automatic history tracking)
    // changedBy for Call Status History is determined inside changeColdCallStatus
    const statusChangeResult = await changeColdCallStatus({
      targetId,
      toStatus: newStatus,
    })

    if (!statusChangeResult.success) {
      return {
        success: false,
        error: statusChangeResult.error || 'Failed to change status',
      }
    }

    const updated = statusChangeResult.target

    // Business logic by status
    switch (newStatus) {
      case 'À rappeler':
        // Create TASK for callback
        if (metadata?.callbackDate) {
          await createTask({
            opportunityId: target.opportunityId ?? undefined,
            contactId: target.contactId ?? undefined,
            coldCallTargetId: targetId,
            type: 'CALL',
            dueAt: metadata.callbackDate,
            priority: 'MEDIUM',
            status: 'TODO',
            notes: 'Relance programmée',
            owner: target.owner,
          })
        }
        break

      case 'Converti':
        // Use centralized conversion engine
        // Manual conversion (drag & drop or status menu) defaults to 'Échange' stage
        // Status already changed by changeColdCallStatus above, skip duplicate status update
        const { convertProspectingTargetToOpportunity } = await import('@/lib/prospecting/opportunity-converter')
        const conversionResult = await convertProspectingTargetToOpportunity({
          targetId,
          initialStage: 'Échange',
          source: 'Cold Call',
          owner: changedBy,
          activityResult: 'CONVERSATION', // Manual conversion defaults to CONVERSATION
          skipStatusChange: true, // Status already changed by changeColdCallStatus above
        })

        if (!conversionResult.success) {
          return {
            success: false,
            error: conversionResult.error || 'Failed to convert to opportunity',
          }
        }

        break

      default:
        // Other statuses: no specific action
        break
    }

    revalidatePath('/cold-call')
    revalidatePath('/today')
    revalidatePath('/pipeline')

    return { success: true, target: updated }
  } catch (error: any) {
    console.error('Error updating cold call status:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update opportunity stage for cold call targets that have linked opportunities
 * Used for Gagné/Perdu columns in cold call view
 */
export async function updateColdCallOpportunityStage(
  targetId: string,
  newStage: Stage
) {
  const { getCurrentOwner } = await import('@/lib/utils/current-owner')
  const changedBy = await getCurrentOwner()
  try {
    const target = await getColdCallTargetById(targetId)

    if (!target.opportunityId) {
      return {
        success: false,
        error: 'No linked opportunity found',
      }
    }

    // Get current opportunity
    const opportunities = await getOpportunities()
    const opportunity = opportunities.find((o) => o.id === target.opportunityId)

    if (!opportunity) {
      return {
        success: false,
        error: 'Opportunity not found',
      }
    }

    // Update opportunity stage
    const updates: Record<string, any> = {
      stage: newStage,
    }

    if (newStage === 'Gagné') {
      updates.wonAt = new Date().toISOString()
    } else if (newStage === 'Perdu') {
      updates.lostAt = new Date().toISOString()
    }

    await updateOpportunity(target.opportunityId, updates)

    // Create stage history
    await createStageHistory({
      opportunityId: target.opportunityId,
      fromStage: opportunity.stage,
      toStage: newStage,
      changedBy,
    })

    revalidatePath('/cold-call')
    revalidatePath('/pipeline')
    revalidatePath(`/prospects/${target.opportunityId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Error updating opportunity stage:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Record a call activity for a cold call target
 * Creates ACTIVITY with result, links to opportunity if exists
 * Automatically converts to Opportunity based on ActivityResult
 */
export async function recordCallActivity(
  targetId: string,
  result: ActivityResult,
  metadata?: {
    callbackDate?: string // For CALLBACK result
  }
) {
  try {
    const { getCurrentOwner } = await import('@/lib/utils/current-owner')
    const owner = await getCurrentOwner()
    const { requiresOpportunityConversion, getInitialOpportunityStage } = await import('@/lib/prospecting/conversion-rules')

    const target = await getColdCallTargetById(targetId)

    // Create ACTIVITY with explicit cold call target link
    await createActivity({
      opportunityId: target.opportunityId ?? undefined,
      contactId: target.contactId ?? undefined,
      coldCallTargetId: targetId,
      type: 'CALL',
      date: new Date().toISOString(),
      result,
      notes: undefined,
      owner,
      durationMinutes: undefined,
    })

    // Check if this result requires Opportunity conversion
    if (requiresOpportunityConversion(result)) {
      // Get the appropriate stage based on result
      const initialStage = getInitialOpportunityStage(result)

      // Use centralized conversion engine
      const { convertProspectingTargetToOpportunity } = await import('@/lib/prospecting/opportunity-converter')
      const conversionResult = await convertProspectingTargetToOpportunity({
        targetId,
        initialStage,
        source: 'Cold Call',
        owner,
        activityResult: result,
      })

      if (!conversionResult.success) {
        return {
          success: false,
          error: conversionResult.error || 'Failed to convert to opportunity',
        }
      }

      const opportunityId = conversionResult.opportunityId!

      // Create TASK for callback if CALLBACK result with date
      if (result === 'CALLBACK' && metadata?.callbackDate) {
        await createTask({
          opportunityId,
          contactId: target.contactId ?? undefined,
          coldCallTargetId: targetId,
          type: 'CALL',
          dueAt: metadata.callbackDate,
          priority: 'MEDIUM',
          status: 'TODO',
          notes: 'Relance programmée',
          owner: target.owner,
        })
      }
    } else {
      // Results that DON'T create Opportunity: update status only
      switch (result) {
        case 'NOT_INTERESTED':
          // Update to Pas intéressé with history tracking
          await changeColdCallStatus({
            targetId,
            toStatus: 'Pas intéressé',
          })
          break

        case 'WRONG_NUMBER':
          // Update to Mauvais numéro with history tracking
          await changeColdCallStatus({
            targetId,
            toStatus: 'Mauvais numéro',
          })
          break

        case 'EMAIL_REQUESTED':
          // Create TASK for email but stay in prospecting
          if (metadata?.callbackDate) {
            await createTask({
              opportunityId: target.opportunityId ?? undefined,
              contactId: target.contactId ?? undefined,
              coldCallTargetId: targetId,
              type: 'EMAIL',
              dueAt: metadata.callbackDate,
              priority: 'MEDIUM',
              status: 'TODO',
              notes: 'Email demandé',
              owner: target.owner,
            })
          }
          break

        // NO_ANSWER, VOICEMAIL: no status change
        default:
          break
      }
    }

    revalidatePath('/cold-call')
    revalidatePath('/today')
    if (target.opportunityId) {
      revalidatePath(`/prospects/${target.opportunityId}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error recording call activity:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Record email reply activity (EMAIL_REPLY)
 * Creates EMAIL activity and triggers Opportunity conversion to stage Échange
 */
export async function recordEmailActivity(targetId: string) {
  try {
    const { getCurrentOwner } = await import('@/lib/utils/current-owner')
    const owner = await getCurrentOwner()
    const { getInitialOpportunityStage } = await import('@/lib/prospecting/conversion-rules')

    const target = await getColdCallTargetById(targetId)

    const result: ActivityResult = 'EMAIL_REPLY'

    // Create ACTIVITY with explicit cold call target link
    await createActivity({
      opportunityId: target.opportunityId ?? undefined,
      contactId: target.contactId ?? undefined,
      coldCallTargetId: targetId,
      type: 'EMAIL',
      date: new Date().toISOString(),
      result,
      notes: undefined,
      owner,
      durationMinutes: undefined,
    })

    // EMAIL_REPLY always requires Opportunity conversion
    // Get the appropriate stage (should be 'Échange')
    const initialStage = getInitialOpportunityStage(result)

    // Use centralized conversion engine
    const { convertProspectingTargetToOpportunity } = await import('@/lib/prospecting/opportunity-converter')
    const conversionResult = await convertProspectingTargetToOpportunity({
      targetId,
      initialStage,
      source: 'Cold Email',
      owner,
      activityResult: result,
    })

    if (!conversionResult.success) {
      return {
        success: false,
        error: conversionResult.error || 'Failed to convert to opportunity',
      }
    }

    revalidatePath('/cold-call')
    revalidatePath('/today')
    if (target.opportunityId) {
      revalidatePath(`/prospects/${target.opportunityId}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error recording email activity:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
