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
import { revalidatePath } from 'next/cache'
import type { CallStatus, Stage, ActivityResult } from '@/types/domain'

/**
 * Update cold call target status
 * Handles business logic for each status transition
 */
export async function updateColdCallStatus(
  targetId: string,
  newStatus: CallStatus,
  changedBy: string,
  metadata?: {
    callbackDate?: string // For "À rappeler"
  }
) {
  try {
    const target = await getColdCallTargetById(targetId)

    // Update cold call target status
    const updated = await updateColdCallTarget(targetId, {
      callStatus: newStatus,
    })

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
            notes: 'Rappel suite cold call',
            owner: target.owner,
          })
        }
        break

      case 'RDV booké':
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
          // DO NOT regress stage if already advanced beyond RDV
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
          const rdvStageIndex = stageOrder.indexOf('RDV')

          // Only update stage if current stage is BEFORE RDV
          if (currentStageIndex < rdvStageIndex) {
            await updateOpportunity(activeOpp.id, {
              stage: 'RDV',
            })
            await createStageHistory({
              opportunityId: activeOpp.id,
              fromStage: activeOpp.stage,
              toStage: 'RDV',
              changedBy,
            })
          }
          // If already at RDV or beyond, just reuse without changing stage

          opportunityId = activeOpp.id
        } else {
          // Get company name for opportunity title
          const { getCompanyById } = await import('@/lib/airtable')
          const company = await getCompanyById(target.companyId)

          // Create new opportunity with company name
          const newOpp = await createOpportunity({
            name: `${company.name} - Cold Call`,
            companyId: target.companyId,
            primaryContactId: target.contactId ?? undefined,
            businessLineId: target.businessLineId,
            owner: target.owner,
            stage: 'RDV',
            source: 'Cold Call',
          })

          // Create initial STAGE_HISTORY
          await createStageHistory({
            opportunityId: newOpp.id,
            fromStage: undefined,
            toStage: 'RDV',
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
  newStage: Stage,
  changedBy: string
) {
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
 * Optionally updates call status based on result
 */
export async function recordCallActivity(
  targetId: string,
  result: ActivityResult,
  owner: string,
  metadata?: {
    callbackDate?: string // For CALLBACK result
  }
) {
  try {
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

    // Automatically update call status based on result
    switch (result) {
      case 'MEETING_BOOKED':
        // Trigger RDV booké workflow
        return await updateColdCallStatus(targetId, 'RDV booké', owner)

      case 'NOT_INTERESTED':
        // Update to Pas intéressé
        await updateColdCallTarget(targetId, {
          callStatus: 'Pas intéressé',
        })
        break

      case 'CALLBACK':
        // Trigger À rappeler workflow with callback date
        if (metadata?.callbackDate) {
          return await updateColdCallStatus(targetId, 'À rappeler', owner, {
            callbackDate: metadata.callbackDate,
          })
        } else {
          // If no date provided, just update status (TASK will be created manually)
          await updateColdCallTarget(targetId, {
            callStatus: 'À rappeler',
          })
        }
        break

      // NO_ANSWER and CONVERSATION: no status change
      default:
        break
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
