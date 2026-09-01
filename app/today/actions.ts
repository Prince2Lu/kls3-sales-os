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
