// Server actions for Cold Call operations

'use server'

import {
  getColdCallTargetById,
  createTask,
  getOpportunities,
  updateOpportunity,
  createStageHistory,
  createActivity,
} from '@/lib/airtable'
import { changeColdCallStatus } from '@/lib/cold-call/status-manager'
import { revalidatePath } from 'next/cache'
import type { CallStatus, Stage, ActivityResult } from '@/types/domain'

/**
 * Update cold call target status
 * Handles business logic for each status transition
 */
export async function updateColdCallStatus(
  targetId: string,
  newStatus: CallStatus,
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
        // Status only: no TASK is created for callbacks.
        break

      case 'Converti':
        // Use centralized conversion engine
        // Manual conversion is explicit and enters the opportunity pipeline at 'Opportunité'
        // Status already changed by changeColdCallStatus above, skip duplicate status update
        const { convertProspectingTargetToOpportunity } = await import('@/lib/prospecting/opportunity-converter')
        const conversionResult = await convertProspectingTargetToOpportunity({
          targetId,
          initialStage: 'Opportunité',
          source: 'Cold Call',
          owner: changedBy,
          activityResult: 'CONVERSATION', // only used for converter metadata; status is already Converti
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
    callbackDate?: string // Legacy input ignored for CALLBACK; kept for compatibility
    notes?: string
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
      notes: metadata?.notes,
      owner,
      durationMinutes: undefined,
    })

    // Only booked meetings trigger automatic Opportunity conversion.
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

    } else {
      // Results that DON'T create Opportunity: update status only
      switch (result) {
        case 'CONVERSATION':
          // A real conversation is still prospecting.
          await changeColdCallStatus({
            targetId,
            toStatus: 'Échange',
          })
          break

        case 'EMAIL_REPLY':
        case 'LINKEDIN_REPLY':
          // A two-way written exchange is still prospecting.
          await changeColdCallStatus({
            targetId,
            toStatus: 'Échange',
          })
          break

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

        case 'CALLBACK':
          // CALLBACK is a prospecting status only. No TASK is created.
          await changeColdCallStatus({
            targetId,
            toStatus: 'À rappeler',
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
 * Record email activity (EMAIL_SENT or EMAIL_REPLY)
 * - EMAIL_SENT: Creates EMAIL activity, stays in prospecting
 * - EMAIL_REPLY: Creates EMAIL activity and moves prospecting status to Échange
 */
export async function recordEmailActivity(
  targetId: string,
  result: 'EMAIL_SENT' | 'EMAIL_REPLY'
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
      type: 'EMAIL',
      date: new Date().toISOString(),
      result,
      notes: undefined,
      owner,
      durationMinutes: undefined,
    })

    if (requiresOpportunityConversion(result)) {
      const initialStage = getInitialOpportunityStage(result)
      const { convertProspectingTargetToOpportunity } = await import('@/lib/prospecting/opportunity-converter')
      const conversionResult = await convertProspectingTargetToOpportunity({
        targetId,
        initialStage,
        source: 'Cold Email',
        owner,
        activityResult: result,
      })
      if (!conversionResult.success) {
        return { success: false, error: conversionResult.error || 'Failed to convert to opportunity' }
      }
    } else if (result === 'EMAIL_REPLY') {
      await changeColdCallStatus({ targetId, toStatus: 'Échange' })
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

/**
 * Record LinkedIn activity (LINKEDIN_SENT or LINKEDIN_REPLY)
 * - LINKEDIN_SENT: Creates LINKEDIN activity, stays in prospecting
 * - LINKEDIN_REPLY: Creates LINKEDIN activity and moves prospecting status to Échange
 */
export async function recordLinkedInActivity(
  targetId: string,
  result: 'LINKEDIN_SENT' | 'LINKEDIN_REPLY'
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
      type: 'LINKEDIN',
      date: new Date().toISOString(),
      result,
      notes: undefined,
      owner,
      durationMinutes: undefined,
    })

    if (requiresOpportunityConversion(result)) {
      const initialStage = getInitialOpportunityStage(result)
      const { convertProspectingTargetToOpportunity } = await import('@/lib/prospecting/opportunity-converter')
      const conversionResult = await convertProspectingTargetToOpportunity({
        targetId,
        initialStage,
        source: 'LinkedIn',
        owner,
        activityResult: result,
      })
      if (!conversionResult.success) {
        return { success: false, error: conversionResult.error || 'Failed to convert to opportunity' }
      }
    } else if (result === 'LINKEDIN_REPLY') {
      await changeColdCallStatus({ targetId, toStatus: 'Échange' })
    }

    revalidatePath('/cold-call')
    revalidatePath('/today')
    if (target.opportunityId) {
      revalidatePath(`/prospects/${target.opportunityId}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error recording LinkedIn activity:', error.message)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
