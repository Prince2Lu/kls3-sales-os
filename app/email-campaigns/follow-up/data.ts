import {
  getActivities, getColdCallTargets, getEmailCampaigns, getEmailEvents, getEmailRecipients, getEmailSuppressions, getTasks,
} from '@/lib/airtable'
import { buildFollowUpQueue } from '@/lib/brevo/follow-up-queue'
import { getBrevoTestRecipientEmail } from '@/lib/prospecting/safety'

export async function loadEmailFollowUp() {
  const [campaigns, recipients, events, tasks, targets, activities, suppressions] = await Promise.all([
    getEmailCampaigns(), getEmailRecipients(), getEmailEvents(), getTasks(),
    getColdCallTargets(), getActivities(), getEmailSuppressions(),
  ])
  const rows = buildFollowUpQueue({ campaigns, recipients, events, tasks, targets, activities, suppressions,
    interestUrlPattern: process.env.BREVO_INTEREST_URL_PATTERN ?? '/demo', testEmail: getBrevoTestRecipientEmail() })
  return { rows, tasks, campaigns }
}
