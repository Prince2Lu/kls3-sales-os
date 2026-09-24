'use server'

import { revalidatePath } from 'next/cache'
import { createTask, updateTask } from '@/lib/airtable'
import { findOrCreateProspectingTarget } from '@/lib/prospecting/target-manager'
import { getBrevoSendMode, getBrevoTestRecipientEmail } from '@/lib/prospecting/safety'
import { nextBusinessDayAtNineParis } from '@/lib/utils/business-day'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import type { Priority } from '@/types/domain'
import { loadEmailFollowUp } from './data'

const rank: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }

function testMarker(key: string) {
  return `[BREVO_TEST_CALL:${key}]`
}

export async function createTestFollowUpAction(key: string) {
  const owner = await getCurrentOwner()
  if (getBrevoSendMode() !== 'test') return { success: false, error: 'Le parcours de test exige BREVO_SEND_MODE=test.' }
  const testEmail = getBrevoTestRecipientEmail()
  const { rows, tasks, targets } = await loadEmailFollowUp()
  const row = rows.find((item) => item.key === key)
  if (!row || !testEmail || row.email !== testEmail || row.state !== 'TEST' || row.priority === 'NONE') {
    return { success: false, error: 'Aucun signal de test éligible. Actualisez la liste.' }
  }
  if (tasks.some((task) => task.status === 'TODO' && task.notes?.includes(testMarker(key)))) {
    return { success: true, alreadyExists: true }
  }
  if (row.testTaskCompletedAt) {
    return { success: false, error: 'La tâche TEST a déjà été effectuée pour ce signal.' }
  }
  // Reuse an existing prospecting target if present; never create one for a test mailbox.
  const target = targets.find((item) => !item.archived && item.companyId === row.companyId &&
    item.contactId === row.contactId && item.businessLineId === row.businessLineId)
  if (!row.contactId && !target) return { success: false, error: 'Le test exige un contact ou une cible de prospection liée.' }
  await createTask({ coldCallTargetId: target?.id, contactId: row.contactId ?? undefined,
    type: 'CALL', dueAt: new Date(Date.now() + 30 * 60_000).toISOString(), priority: row.priority,
    status: 'TODO', owner,
    notes: `${testMarker(key)} TEST UNIQUEMENT — appel après campagne. ${row.reason}. Annuler depuis « Tests » après vérification.` })
  revalidatePath('/email-campaigns/follow-up')
  revalidatePath('/today')
  return { success: true, created: true }
}

export async function cancelTestFollowUpAction(key: string) {
  const owner = await getCurrentOwner()
  const testEmail = getBrevoTestRecipientEmail()
  const { rows, tasks } = await loadEmailFollowUp()
  const row = rows.find((item) => item.key === key)
  if (!row || !testEmail || row.email !== testEmail || row.state !== 'TEST') {
    return { success: false, error: 'Destinataire de test introuvable.' }
  }
  const task = tasks.find((item) => item.status === 'TODO' && item.owner === owner && item.notes?.includes(testMarker(key)))
  if (!task) return { success: false, error: 'Aucune tâche de test ouverte pour votre compte.' }
  await updateTask(task.id, { status: 'CANCELLED' })
  revalidatePath('/email-campaigns/follow-up')
  revalidatePath('/today')
  return { success: true }
}

export async function planEmailFollowUpAction(keys: string[]) {
  const owner = await getCurrentOwner()
  const uniqueKeys = [...new Set(keys)]
  if (!uniqueKeys.length || uniqueKeys.length > 10) return { success: false, error: 'Choisissez entre 1 et 10 prospects par lot.' }
  const { rows, tasks, campaigns } = await loadEmailFollowUp()
  const selected = uniqueKeys.map((key) => rows.find((row) => row.key === key))
  if (selected.some((row) => !row || !['AVAILABLE', 'TASK_OPEN'].includes(row.state) || row.priority === 'NONE')) {
    return { success: false, error: 'Un prospect a changé de statut. Actualisez la liste avant de planifier.' }
  }
  let created = 0
  let updated = 0
  for (const row of selected) {
    if (!row || row.priority === 'NONE') continue
    const priority: Priority = row.priority
    const marker = `[EMAIL_QUEUE:${row.key}]`
    if (row.taskId) {
      const task = tasks.find((item) => item.id === row.taskId)
      if (task && rank[priority] > rank[task.priority ?? 'LOW']) {
        await updateTask(task.id, { priority, notes: `${task.notes ?? ''}\n${marker} Nouveau signal : ${row.reason}`.trim() })
        updated++
      }
      continue
    }
    const campaign = campaigns.find((item) => item.businessLineId === row.businessLineId && row.campaignNames.includes(item.name))
    if (!campaign) return { success: false, error: 'Campagne introuvable.' }
    const { target } = await findOrCreateProspectingTarget({ companyId: row.companyId, contactId: row.contactId,
      businessLineId: row.businessLineId, owner: campaign.createdBy, status: 'Email Flow' })
    await createTask({ coldCallTargetId: target.id, contactId: row.contactId ?? undefined, type: 'CALL',
      dueAt: nextBusinessDayAtNineParis().toISOString(), priority, status: 'TODO', owner: target.owner,
      notes: `${marker} Appel après campagne email. ${row.reason}. Campagnes : ${row.campaignNames.join(', ')}.` })
    created++
  }
  revalidatePath('/email-campaigns/follow-up')
  revalidatePath('/today')
  revalidatePath('/cold-call')
  return { success: true, created, updated }
}
