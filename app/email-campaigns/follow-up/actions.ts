'use server'

import { revalidatePath } from 'next/cache'
import { createTask, updateTask } from '@/lib/airtable'
import { findOrCreateProspectingTarget } from '@/lib/prospecting/target-manager'
import { nextBusinessDayAtNineParis } from '@/lib/utils/business-day'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import type { Priority } from '@/types/domain'
import { loadEmailFollowUp } from './data'

const rank: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }

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
