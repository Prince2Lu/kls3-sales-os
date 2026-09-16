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
        // Check if opportunity already exists for this company + BL
        const existingOpps = await getOpportunities({
          companyId: target.companyId,
          businessLineId: target.businessLineId,
        })

        const activeOpp = existingOpps.find(
          (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
        )

        let opportunityId: string

        if (activeOpp) {
          // Reuse existing opportunity
          // DO NOT regress stage if already advanced beyond Échange
          const stageOrder = [
            'À prospecter',
            'Contacté',
            'Échange',
            'Qualifié',
            'RDV',
            'Opportunité',
            'Proposition',
            'Gagné',
            'Perdu',
          ]
          const currentStageIndex = stageOrder.indexOf(activeOpp.stage)
          const echangeStageIndex = stageOrder.indexOf('Échange')

          // Only update stage if current stage is BEFORE Échange
          if (currentStageIndex < echangeStageIndex) {
            await updateOpportunity(activeOpp.id, {
              stage: 'Échange',
            })
            await createStageHistory({
              opportunityId: activeOpp.id,
              fromStage: activeOpp.stage,
              toStage: 'Échange',
              changedBy,
            })
          }
          // If already at Échange or beyond, just reuse without changing stage

          opportunityId = activeOpp.id
        } else {
          // Get company name for opportunity title
          const { getCompanyById } = await import('@/lib/airtable')
          const company = await getCompanyById(target.companyId)

          // Create new opportunity with company name
          const newOpp = await createOpportunity({
            name: `${company.name} - Prospection`,
            companyId: target.companyId,
            primaryContactId: target.contactId ?? undefined,
            businessLineId: target.businessLineId,
            owner: target.owner,
            stage: 'Échange', // Generic conversion stage (requiresOpportunityConversion logic)
            source: 'Cold Call',
          })

          // Create initial STAGE_HISTORY
          await createStageHistory({
            opportunityId: newOpp.id,
            fromStage: undefined,
            toStage: 'Échange',
            changedBy,
          })

          opportunityId = newOpp.id
        }

        // Link opportunity to cold call target
        await updateColdCallTarget(targetId, {
          opportunityId,
        })

        // Update existing TASKS (callbacks) to link them to the opportunity
        const { getTasks, updateTask, getActivities, updateActivity } = await import('@/lib/airtable')

        const [tasks, activities] = await Promise.all([
          getTasks({
            contactId: target.contactId ?? undefined,
            status: 'TODO',
          }),
          getActivities({
            contactId: target.contactId ?? undefined,
          }),
        ])

        // Link TASKS that were created for THIS exact target
        const tasksToUpdate = tasks.filter(
          (task) => task.coldCallTargetId === targetId && !task.opportunityId
        )

        for (const task of tasksToUpdate) {
          await updateTask(task.id, {
            opportunityId,
          })
        }

        // Link ACTIVITIES that were created for THIS exact target
        const activitiesToUpdate = activities.filter(
          (activity) =>
            activity.coldCallTargetId === targetId && !activity.opportunityId
        )

        for (const activity of activitiesToUpdate) {
          await updateActivity(activity.id, {
            opportunityId,
          })
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
