// Prospecting → Opportunity Conversion Engine
// Centralized logic for converting ProspectingTargets to Opportunities
// Used by all activity types that trigger conversion (CALL, EMAIL, etc.)

import type { Owner, Stage, ActivityResult, ProspectingStatus } from '@/types/domain'
import {
  getColdCallTargetById,
  getOpportunities,
  updateOpportunity,
  createOpportunity,
  createStageHistory,
  updateColdCallTarget,
  getTasks,
  updateTask,
  getActivities,
  updateActivity,
  getCompanyById,
} from '@/lib/airtable'
import { changeColdCallStatus } from '@/lib/cold-call/status-manager'

/**
 * Convert ProspectingTarget to Opportunity
 * Handles:
 * - Find/reuse existing Opportunity
 * - Create new Opportunity if none exists
 * - Stage progression (never regress)
 * - Link Opportunity to ProspectingTarget
 * - Update ProspectingTarget status (RDV booké or Converti)
 * - Retro-link pre-conversion Activities and Tasks
 */
export async function convertProspectingTargetToOpportunity(params: {
  targetId: string
  initialStage: Stage
  source: string // e.g., 'Cold Call', 'Cold Email'
  owner: Owner
  activityResult: ActivityResult // Used to determine ProspectingStatus
  skipStatusChange?: boolean // Skip status update if already changed (manual drag & drop)
}): Promise<{
  success: boolean
  opportunityId?: string
  error?: string
}> {
  try {
    const { targetId, initialStage, source, owner, activityResult, skipStatusChange = false } = params

    const target = await getColdCallTargetById(targetId)

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
      // DO NOT regress stage if already advanced beyond initialStage
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
      const targetStageIndex = stageOrder.indexOf(initialStage)

      const updates: Record<string, any> = {}

      // Only update stage if current stage is BEFORE target stage
      if (currentStageIndex < targetStageIndex) {
        updates.stage = initialStage
      }

      // Enrich Primary Contact if empty and target has contact
      if (!activeOpp.primaryContactId && target.contactId) {
        updates.primaryContactId = target.contactId
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await updateOpportunity(activeOpp.id, updates)

        // Create STAGE_HISTORY only if stage changed
        if (updates.stage) {
          await createStageHistory({
            opportunityId: activeOpp.id,
            fromStage: activeOpp.stage,
            toStage: initialStage,
            changedBy: owner,
          })
        }
      }

      opportunityId = activeOpp.id
    } else {
      // RETRY PROTECTION: Check again before creating (race condition mitigation)
      // If concurrent request created an opportunity between first check and now, reuse it
      const recheckOpps = await getOpportunities({
        companyId: target.companyId,
        businessLineId: target.businessLineId,
      })

      const recheckActiveOpp = recheckOpps.find(
        (opp) => opp.stage !== 'Gagné' && opp.stage !== 'Perdu'
      )

      if (recheckActiveOpp) {
        // Concurrent creation detected - reuse the existing opportunity
        // Apply same logic as above (stage progression + primary contact enrichment)
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
        const currentStageIndex = stageOrder.indexOf(recheckActiveOpp.stage)
        const targetStageIndex = stageOrder.indexOf(initialStage)

        const updates: Record<string, any> = {}

        if (currentStageIndex < targetStageIndex) {
          updates.stage = initialStage
        }

        if (!recheckActiveOpp.primaryContactId && target.contactId) {
          updates.primaryContactId = target.contactId
        }

        if (Object.keys(updates).length > 0) {
          await updateOpportunity(recheckActiveOpp.id, updates)

          if (updates.stage) {
            await createStageHistory({
              opportunityId: recheckActiveOpp.id,
              fromStage: recheckActiveOpp.stage,
              toStage: initialStage,
              changedBy: owner,
            })
          }
        }

        opportunityId = recheckActiveOpp.id
      } else {
        // No concurrent creation - safe to create new opportunity
        const company = await getCompanyById(target.companyId)

        const newOpp = await createOpportunity({
          name: `${company.name} - Prospection`,
          companyId: target.companyId,
          primaryContactId: target.contactId ?? undefined,
          businessLineId: target.businessLineId,
          owner: target.owner,
          stage: initialStage,
          source,
        })

        // Create initial STAGE_HISTORY
        await createStageHistory({
          opportunityId: newOpp.id,
          fromStage: undefined,
          toStage: initialStage,
          changedBy: owner,
        })

        opportunityId = newOpp.id
      }
    }

    // Link opportunity to cold call target
    await updateColdCallTarget(targetId, {
      opportunityId,
    })

    // Update prospecting status based on activity result (unless already changed)
    // MEETING_BOOKED → 'RDV booké' (visible in board)
    // CONVERSATION/EMAIL_REPLY/CALLBACK → 'Converti' (visible in board)
    if (!skipStatusChange) {
      const { getConvertedProspectingStatus } = await import('@/lib/prospecting/conversion-rules')
      const convertedStatus = getConvertedProspectingStatus(activityResult)

      await changeColdCallStatus({
        targetId,
        toStatus: convertedStatus,
      })
    }

    // Update existing TASKS and ACTIVITIES to link them to the opportunity
    // IMPORTANT: Filter by coldCallTargetId directly (not contactId)
    // This ensures targets without contact are handled correctly
    const [allTasks, allActivities] = await Promise.all([
      getTasks({ maxRecords: 1000 }),
      getActivities({ maxRecords: 1000 }),
    ])

    // Link TASKS that were created for THIS exact target
    const tasksToUpdate = allTasks.filter(
      (task) => task.coldCallTargetId === targetId && !task.opportunityId
    )

    for (const task of tasksToUpdate) {
      await updateTask(task.id, {
        opportunityId,
      })
    }

    // Link ACTIVITIES that were created for THIS exact target
    const activitiesToUpdate = allActivities.filter(
      (activity) =>
        activity.coldCallTargetId === targetId && !activity.opportunityId
    )

    for (const activity of activitiesToUpdate) {
      await updateActivity(activity.id, {
        opportunityId,
      })
    }

    return { success: true, opportunityId }
  } catch (error: any) {
    console.error('Error converting prospecting target to opportunity:', error.message)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
