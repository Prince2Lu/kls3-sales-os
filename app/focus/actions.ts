'use server'

// Focus Mode server actions (Phase 5)
// Handles all workflow operations with proper ordering for data safety

import { revalidatePath } from 'next/cache'
import {
  createActivity,
  createTask,
  updateTask,
  updateOpportunity,
  createStageHistory,
  getTasks,
} from '@/lib/airtable'
import type { Owner, Stage, TaskType, ActivityResult } from '@/types/domain'

// ============================================================================
// HELPER: Combine date + time into ISO string
// ============================================================================

function combineDateTimeToISO(date: string, time: string): string {
  return `${date}T${time}:00.000Z`
}

// ============================================================================
// HELPER: Check if opportunity needs stage transition
// ============================================================================

function shouldTransitionToEchange(currentStage: Stage | null | undefined): boolean {
  if (!currentStage) return false
  return currentStage === 'À prospecter' || currentStage === 'Contacté'
}

function shouldTransitionToRDV(currentStage: Stage | null | undefined): boolean {
  if (!currentStage) return false
  const earlyStages: Stage[] = ['À prospecter', 'Contacté', 'Échange', 'Qualifié']
  return earlyStages.includes(currentStage)
}

// ============================================================================
// HELPER: Check for existing TODO tasks for an opportunity
// ============================================================================

async function hasExistingTodoTask(opportunityId: string | null): Promise<boolean> {
  if (!opportunityId) return false

  const tasks = await getTasks({ maxRecords: 100 })
  const todoTasks = tasks.filter(
    (t) => t.opportunityId === opportunityId && t.status === 'TODO'
  )

  return todoTasks.length > 0
}

// ============================================================================
// CASE A: NO_ANSWER
// ============================================================================

export async function processNoAnswer(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  nextActionDate: string
  nextActionTime: string
  notes?: string
}) {
  const { taskId, opportunityId, contactId, owner, nextActionDate, nextActionTime, notes } =
    input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'CALL',
    date: new Date().toISOString(),
    result: 'NO_ANSWER',
    notes: notes || undefined,
    owner,
    durationMinutes: undefined,
  })

  // 2. Create next TASK (callback)
  await createTask({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'CALL',
    dueAt: combineDateTimeToISO(nextActionDate, nextActionTime),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: notes || undefined,
    owner,
  })

  // 3. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}

// ============================================================================
// CASE B: CONVERSATION
// ============================================================================

export async function processConversation(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  currentStage: Stage | null | undefined
  nextActionType: TaskType
  nextActionDate: string
  nextActionTime: string
  notes?: string
}) {
  const {
    taskId,
    opportunityId,
    contactId,
    owner,
    currentStage,
    nextActionType,
    nextActionDate,
    nextActionTime,
    notes,
  } = input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'CALL',
    date: new Date().toISOString(),
    result: 'CONVERSATION',
    notes: notes || undefined,
    owner,
    durationMinutes: undefined,
  })

  // 2. Create next TASK
  await createTask({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: nextActionType,
    dueAt: combineDateTimeToISO(nextActionDate, nextActionTime),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: notes || undefined,
    owner,
  })

  // 3. Stage transition if appropriate (early stage → Échange)
  if (opportunityId && shouldTransitionToEchange(currentStage)) {
    await updateOpportunity(opportunityId, {
      stage: 'Échange',
    })

    await createStageHistory({
      opportunityId,
      fromStage: currentStage || undefined,
      toStage: 'Échange',
      changedBy: owner,
    })
  }

  // 4. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')
  revalidatePath('/pipeline')

  return { success: true }
}

// ============================================================================
// CASE C: MEETING_BOOKED
// ============================================================================

export async function processMeetingBooked(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  currentStage: Stage | null | undefined
  meetingDate: string
  meetingTime: string
  notes?: string
}) {
  const {
    taskId,
    opportunityId,
    contactId,
    owner,
    currentStage,
    meetingDate,
    meetingTime,
    notes,
  } = input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'CALL',
    date: new Date().toISOString(),
    result: 'MEETING_BOOKED',
    notes: notes || undefined,
    owner,
    durationMinutes: undefined,
  })

  // 2. Create MEETING TASK
  await createTask({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'MEETING',
    dueAt: combineDateTimeToISO(meetingDate, meetingTime),
    priority: 'HIGH',
    status: 'TODO',
    notes: notes || undefined,
    owner,
  })

  // 3. Stage transition if appropriate (earlier stage → RDV)
  if (opportunityId && shouldTransitionToRDV(currentStage)) {
    await updateOpportunity(opportunityId, {
      stage: 'RDV',
    })

    await createStageHistory({
      opportunityId,
      fromStage: currentStage || undefined,
      toStage: 'RDV',
      changedBy: owner,
    })
  }

  // 4. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')
  revalidatePath('/pipeline')

  return { success: true }
}

// ============================================================================
// CASE D: CALLBACK
// ============================================================================

export async function processCallback(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  callbackDate: string
  callbackTime: string
  notes?: string
}) {
  const { taskId, opportunityId, contactId, owner, callbackDate, callbackTime, notes } =
    input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'CALL',
    date: new Date().toISOString(),
    result: 'CALLBACK',
    notes: notes || undefined,
    owner,
    durationMinutes: undefined,
  })

  // 2. Create callback TASK
  await createTask({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'FOLLOW_UP',
    dueAt: combineDateTimeToISO(callbackDate, callbackTime),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: notes || undefined,
    owner,
  })

  // 3. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}

// ============================================================================
// CASE E/F: NOT_INTERESTED
// ============================================================================

export async function processNotInterested(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  closeLost: boolean
  nextActionType?: TaskType
  nextActionDate?: string
  nextActionTime?: string
  notes?: string
}) {
  const {
    taskId,
    opportunityId,
    contactId,
    owner,
    closeLost,
    nextActionType,
    nextActionDate,
    nextActionTime,
    notes,
  } = input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'CALL',
    date: new Date().toISOString(),
    result: 'NOT_INTERESTED',
    notes: notes || undefined,
    owner,
    durationMinutes: undefined,
  })

  // 2. If closing as lost
  if (closeLost && opportunityId) {
    await updateOpportunity(opportunityId, {
      stage: 'Perdu',
      lostAt: new Date().toISOString(),
      lostReason: 'Pas intéressé',
    })

    await createStageHistory({
      opportunityId,
      fromStage: undefined, // We don't have previous stage here
      toStage: 'Perdu',
      changedBy: owner,
    })
  }

  // 3. If keeping open, create next task
  if (!closeLost && nextActionType && nextActionDate && nextActionTime) {
    await createTask({
      opportunityId: opportunityId || undefined,
      contactId: contactId || undefined,
      type: nextActionType,
      dueAt: combineDateTimeToISO(nextActionDate, nextActionTime),
      priority: 'LOW',
      status: 'TODO',
      notes: notes || undefined,
      owner,
    })
  }

  // 4. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')
  revalidatePath('/pipeline')

  return { success: true }
}

// ============================================================================
// EMAIL_SENT
// ============================================================================

export async function processEmailSent(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  notes?: string
}) {
  const { taskId, opportunityId, contactId, owner, notes } = input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'EMAIL',
    date: new Date().toISOString(),
    result: undefined, // EMAIL doesn't map to existing ActivityResult
    notes: notes || 'Email envoyé',
    owner,
    durationMinutes: undefined,
  })

  // 2. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}

// ============================================================================
// LINKEDIN_DONE
// ============================================================================

export async function processLinkedInDone(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  notes?: string
}) {
  const { taskId, opportunityId, contactId, owner, notes } = input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'LINKEDIN',
    date: new Date().toISOString(),
    result: undefined,
    notes: notes || 'Action LinkedIn effectuée',
    owner,
    durationMinutes: undefined,
  })

  // 2. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}

// ============================================================================
// MEETING_DONE
// ============================================================================

export async function processMeetingDone(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  nextActionType: TaskType
  nextActionDate: string
  nextActionTime: string
  notes?: string
}) {
  const {
    taskId,
    opportunityId,
    contactId,
    owner,
    nextActionType,
    nextActionDate,
    nextActionTime,
    notes,
  } = input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'MEETING',
    date: new Date().toISOString(),
    result: undefined,
    notes: notes || 'RDV réalisé',
    owner,
    durationMinutes: undefined,
  })

  // 2. Create next TASK
  await createTask({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: nextActionType,
    dueAt: combineDateTimeToISO(nextActionDate, nextActionTime),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: notes || undefined,
    owner,
  })

  // 3. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}

// ============================================================================
// DEMO_DONE
// ============================================================================

export async function processDemoDone(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  nextActionType: TaskType
  nextActionDate: string
  nextActionTime: string
  notes?: string
}) {
  const {
    taskId,
    opportunityId,
    contactId,
    owner,
    nextActionType,
    nextActionDate,
    nextActionTime,
    notes,
  } = input

  // 1. Create ACTIVITY
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'DEMO',
    date: new Date().toISOString(),
    result: undefined,
    notes: notes || 'Démo réalisée',
    owner,
    durationMinutes: undefined,
  })

  // 2. Create next TASK
  await createTask({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: nextActionType,
    dueAt: combineDateTimeToISO(nextActionDate, nextActionTime),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: notes || undefined,
    owner,
  })

  // 3. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}

// ============================================================================
// TASK_DONE
// ============================================================================

export async function processTaskDone(input: {
  taskId: string
  opportunityId: string | null
  contactId: string | null
  owner: Owner
  notes?: string
}) {
  const { taskId, opportunityId, contactId, owner, notes } = input

  // 1. Create ACTIVITY (generic OTHER type)
  await createActivity({
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    type: 'OTHER',
    date: new Date().toISOString(),
    result: undefined,
    notes: notes || 'Tâche effectuée',
    owner,
    durationMinutes: undefined,
  })

  // 2. Complete current TASK
  await updateTask(taskId, {
    status: 'DONE',
    completedAt: new Date().toISOString(),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}

// ============================================================================
// POSTPONE
// ============================================================================

export async function processPostpone(input: {
  taskId: string
  newDate: string
  newTime: string
}) {
  const { taskId, newDate, newTime } = input

  // Simply update the task's dueAt - don't create activity or complete
  await updateTask(taskId, {
    dueAt: combineDateTimeToISO(newDate, newTime),
  })

  // Revalidate
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/prospects')

  return { success: true }
}
