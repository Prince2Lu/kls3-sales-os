'use server'

import { createActivity, getActivityById, updateActivity } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { revalidateCrmContext } from './crm-revalidation'
import type { ActivityResult, ActivityType } from '@/types/domain'

const TYPES: ActivityType[] = ['CALL', 'EMAIL', 'LINKEDIN', 'MEETING', 'DEMO', 'PROPOSAL', 'NOTE', 'OTHER']
const RESULTS: ActivityResult[] = ['NO_ANSWER', 'CONVERSATION', 'MEETING_BOOKED', 'NOT_INTERESTED', 'CALLBACK', 'WRONG_NUMBER', 'VOICEMAIL', 'EMAIL_REQUESTED', 'EMAIL_SENT', 'EMAIL_REPLY', 'LINKEDIN_SENT', 'LINKEDIN_REPLY']
type ActivityDetails = { type: ActivityType; date: string; result?: ActivityResult | ''; notes?: string; durationMinutes?: number }

function validate(data: ActivityDetails, existingDate?: string) {
  if (!TYPES.includes(data.type)) throw new Error("Type d’activité invalide.")
  if (!Number.isFinite(Date.parse(data.date))) throw new Error('Date invalide.')
  if (data.result && !RESULTS.includes(data.result)) throw new Error('Résultat invalide.')
  if (data.durationMinutes !== undefined && (!Number.isFinite(data.durationMinutes) || data.durationMinutes < 0)) throw new Error('Durée invalide.')
  // Permit corrections to legacy future activities without silently converting or deleting them.
  if (data.date !== existingDate && Date.parse(data.date) > Date.now() + 60_000) {
    throw new Error('Pour une action future, utilisez « Planifier un rendez-vous » ou « Créer une tâche ». Une activité décrit une action réalisée.')
  }
}

export async function createGenericActivity(data: ActivityDetails & {
  contactId?: string; opportunityId?: string; coldCallTargetId?: string; revalidatePaths?: string[]
}) {
  try {
    const owner = await getCurrentOwner()
    validate(data)
    if (!data.contactId && !data.opportunityId && !data.coldCallTargetId) throw new Error('Choisissez un contact, une opportunité ou une cible de prospection.')
    await createActivity({
      contactId: data.contactId, opportunityId: data.opportunityId, coldCallTargetId: data.coldCallTargetId,
      type: data.type, date: data.date, result: data.result || undefined,
      notes: data.notes?.trim(), durationMinutes: data.durationMinutes, owner,
    })
    await revalidateCrmContext()
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

export async function updateGenericActivity(activityId: string, data: ActivityDetails) {
  try {
    await getCurrentOwner()
    const activity = await getActivityById(activityId)
    validate(data, activity.date)
    // Update only editable fields. Never overwrite owner or business links from client input.
    await updateActivity(activityId, {
      type: data.type, date: data.date, result: data.result || '', notes: data.notes?.trim() || '',
      durationMinutes: data.durationMinutes ?? null,
    })
    await revalidateCrmContext()
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}
