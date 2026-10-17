'use server'

import { createActivity } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { revalidatePath } from 'next/cache'
import type { ActivityResult, ActivityType } from '@/types/domain'

export async function createGenericActivity(data: {
  contactId?: string
  opportunityId?: string
  coldCallTargetId?: string
  type: ActivityType
  date: string
  result?: ActivityResult
  notes?: string
  durationMinutes?: number
  revalidatePaths?: string[]
}) {
  try {
    if (!data.contactId && !data.opportunityId && !data.coldCallTargetId) {
      return { success: false, error: 'Une activité doit être liée à un contact, une opportunité ou une cible de prospection.' }
    }

    const owner = await getCurrentOwner()

    await createActivity({
      contactId: data.contactId,
      opportunityId: data.opportunityId,
      coldCallTargetId: data.coldCallTargetId,
      type: data.type,
      date: data.date,
      result: data.result,
      notes: data.notes,
      durationMinutes: data.durationMinutes,
      owner,
    })

    revalidatePath('/companies')
    revalidatePath('/contacts')
    revalidatePath('/prospects')
    revalidatePath('/cold-call')
    for (const path of data.revalidatePaths || []) revalidatePath(path)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
