'use server'

import { createActivity, createTask, getContactById, getColdCallTargetById } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { revalidatePath } from 'next/cache'
import type { ActivityType, TaskType, Priority } from '@/types/domain'

const activityTypes: ActivityType[] = ['CALL','EMAIL','LINKEDIN','MEETING','DEMO','PROPOSAL','NOTE','OTHER']
const taskTypes: TaskType[] = ['CALL','EMAIL','LINKEDIN','MEETING','DEMO','PROPOSAL','DOCUMENT','FOLLOW_UP','OTHER']
const priorities: Priority[] = ['LOW','MEDIUM','HIGH','URGENT']

type Context = { contactId: string; coldCallTargetId?: string }

async function verifyContext(data: Context) {
  if (!data.contactId) throw new Error('Sélectionner un contact')
  await getContactById(data.contactId)
  if (data.coldCallTargetId) {
    const target = await getColdCallTargetById(data.coldCallTargetId)
    if (target.contactId !== data.contactId) throw new Error('Contact et prospection incompatibles')
  }
}

function refresh(contactId: string) {
  revalidatePath('/cold-call')
  revalidatePath('/today')
  revalidatePath('/companies')
  revalidatePath('/contacts/' + contactId)
}

export async function addManualActivity(data: Context & { type: ActivityType; date: string; notes: string }) {
  try {
    await verifyContext(data)
    if (!activityTypes.includes(data.type)) throw new Error('Type invalide')
    if (!data.date || !Number.isFinite(Date.parse(data.date))) throw new Error('Date invalide')
    if (!data.notes.trim()) throw new Error('Renseigner le compte rendu')
    await createActivity({
      contactId: data.contactId,
      coldCallTargetId: data.coldCallTargetId,
      type: data.type,
      date: new Date(data.date).toISOString(),
      notes: data.notes.trim(),
      owner: await getCurrentOwner(),
    })
    refresh(data.contactId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

export async function addManualFollowUp(data: Context & { type: TaskType; dueAt: string; priority: Priority; notes: string }) {
  try {
    await verifyContext(data)
    if (!taskTypes.includes(data.type) || !priorities.includes(data.priority)) throw new Error('Type ou priorité invalide')
    if (!data.dueAt || !Number.isFinite(Date.parse(data.dueAt))) throw new Error('Échéance invalide')
    await createTask({
      contactId: data.contactId,
      coldCallTargetId: data.coldCallTargetId,
      type: data.type,
      dueAt: new Date(data.dueAt).toISOString(),
      priority: data.priority,
      status: 'TODO',
      notes: data.notes.trim(),
      owner: await getCurrentOwner(),
    })
    refresh(data.contactId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}
