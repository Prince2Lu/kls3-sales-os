/**
 * COLD CALL STATUS MANAGER
 *
 * Centralized Call Status change logic with automatic history tracking
 * All Call Status changes MUST go through this module to ensure proper history
 */

'use server'

import {
  getColdCallTargetById,
  updateColdCallTarget,
  createCallStatusHistory,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import type { CallStatus, ColdCallTarget } from '@/types/domain'

/**
 * Change Cold Call Target status with automatic history tracking
 *
 * IDEMPOTENT: If current status === target status, no-op (no update, no history)
 *
 * Changed By is determined server-side from authenticated session
 *
 * @param targetId - Cold Call Target ID
 * @param toStatus - New Call Status
 * @returns Updated target and whether change was applied
 */
export async function changeColdCallStatus(params: {
  targetId: string
  toStatus: CallStatus
}): Promise<{
  success: boolean
  target: ColdCallTarget
  statusChanged: boolean
  error?: string
}> {
  try {
    const { targetId, toStatus } = params

    // Get changedBy server-side from authenticated session
    const changedBy = await getCurrentOwner()

    // Get current target
    const currentTarget = await getColdCallTargetById(targetId)
    const fromStatus = currentTarget.callStatus

    // IDEMPOTENT: If already at target status, no-op
    if (fromStatus === toStatus) {
      return {
        success: true,
        target: currentTarget,
        statusChanged: false,
      }
    }

    // Update Call Status
    const updatedTarget = await updateColdCallTarget(targetId, {
      callStatus: toStatus,
    })

    // Create history record with compensation mechanism
    try {
      await createCallStatusHistory({
        coldCallTargetId: targetId,
        fromStatus,
        toStatus,
        changedAt: new Date().toISOString(),
        changedBy,
      })
    } catch (historyError: any) {
      // COMPENSATION: History creation failed, attempt to revert status change
      console.error('[changeColdCallStatus] CRITICAL: History creation failed:', historyError.message)
      console.error('[changeColdCallStatus] Attempting to revert status change...')

      try {
        await updateColdCallTarget(targetId, {
          callStatus: fromStatus,
        })
        console.error('[changeColdCallStatus] Status reverted successfully')
      } catch (revertError: any) {
        console.error('[changeColdCallStatus] CRITICAL: Failed to revert status change:', revertError.message)
        console.error('[changeColdCallStatus] Target is now in inconsistent state (status changed without history)')
      }

      return {
        success: false,
        target: currentTarget,
        statusChanged: false,
        error: `Failed to create history record: ${historyError.message}`,
      }
    }

    return {
      success: true,
      target: updatedTarget,
      statusChanged: true,
    }
  } catch (error: any) {
    console.error('[changeColdCallStatus] Error:', error.message)
    return {
      success: false,
      target: {} as ColdCallTarget, // Will be ignored on error
      statusChanged: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
