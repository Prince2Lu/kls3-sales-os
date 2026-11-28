// Server actions for today page (Phase 4)

'use server'

import { updateTask } from '@/lib/airtable'
import { revalidatePath } from 'next/cache'

export async function completeTaskAction(taskId: string) {
  try {
    await updateTask(taskId, {
      status: 'DONE',
      completedAt: new Date().toISOString(),
    })

    revalidatePath('/today')
    revalidatePath('/prospects')
    revalidatePath('/pipeline')

    return { success: true }
  } catch (error) {
    console.error('Failed to complete task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function cancelTaskAction(taskId: string) {
  try {
    await updateTask(taskId, {
      status: 'CANCELLED',
    })

    revalidatePath('/today')
    revalidatePath('/prospects')
    revalidatePath('/pipeline')

    return { success: true }
  } catch (error) {
    console.error('Failed to cancel task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Checks the current user's INBOX for replies to their Sales OS direct emails (Trello #65).
 * Same logic as the daily cron, limited to the signed-in user.
 */
export async function checkMyEmailRepliesAction() {
  try {
    const { getCurrentOwner } = await import('@/lib/utils/current-owner')
    const { syncDirectEmailReplies } = await import('@/lib/email-replies/sync')
    const owner = await getCurrentOwner()
    const result = await syncDirectEmailReplies({ owners: [owner] })
    const mine = result.owners[0]
    if (mine?.error) return { success: false as const, error: `Lecture de la boîte impossible : ${mine.error}` }

    if (result.logged > 0) {
      revalidatePath('/today')
      revalidatePath('/cold-call')
    }
    return { success: true as const, checked: !!mine?.checked, found: mine?.found ?? 0, logged: result.logged }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Vérification impossible.' }
  }
}
