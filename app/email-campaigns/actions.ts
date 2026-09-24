'use server'

import { revalidatePath } from 'next/cache'
import {
  createActivity, createEmailCampaign, createEmailRecipient, createTask, getActivities, getBusinessLineByCode, getColdCallTargets, getCompanies, getContacts, getEmailCampaigns,
  getEmailCampaignById, getEmailRecipients, getEmailSuppressions, getTasks, updateEmailCampaign, updateEmailRecipient, updateTask,
} from '@/lib/airtable'
import { createBrevoCampaign, createBrevoList, getBrevoTemplate, previewBrevoTemplate, sendBrevoCampaignNow, sendBrevoTemplateTest, upsertBrevoContact } from '@/lib/brevo/client'
import { buildCampaignAudience } from '@/lib/brevo/campaign-audience'
import { getBrevoSendMode, getBrevoTestRecipientEmail } from '@/lib/prospecting/safety'
import { findOrCreateProspectingTarget } from '@/lib/prospecting/target-manager'
import { emailReplyFollowUpDueParis } from '@/lib/utils/business-day'
import { getCurrentOwner } from '@/lib/utils/current-owner'

async function inBatches<T>(items: T[], size: number, operation: (item: T) => Promise<unknown>): Promise<void> {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(operation))
  }
}

function isSuppressed(
  recipient: { email: string; companyId: string; contactId: string | null },
  suppressions: Awaited<ReturnType<typeof getEmailSuppressions>>
): boolean {
  return suppressions.some((item) => item.active && (
    (item.scope === 'EMAIL' && item.email.toLowerCase() === recipient.email.toLowerCase()) ||
    (item.scope === 'COMPANY' && item.companyId === recipient.companyId) ||
    (item.scope === 'CONTACT' && !!recipient.contactId && item.contactId === recipient.contactId)
  ))
}


function parseTemplateId(value: string | number): number | null {
  const templateId = Number(value)
  return Number.isInteger(templateId) && templateId > 0 ? templateId : null
}

async function requireActiveTemplate(value: string | number) {
  const templateId = parseTemplateId(value)
  if (!templateId) throw new Error('Sélectionnez un modèle Brevo valide.')
  const template = await getBrevoTemplate(templateId)
  if (!template.isActive) throw new Error("Ce modèle Brevo n'est plus actif.")
  return template
}


export async function previewCampaignEmailAction(input: { templateId: string | number; companyId: string; contactId: string | null }) {
  await getCurrentOwner()
  try {
    const template = await requireActiveTemplate(input.templateId)
    const [companies, contacts, suppressions] = await Promise.all([
      getCompanies({ maxRecords: 2000 }),
      getContacts({ maxRecords: 5000 }),
      getEmailSuppressions(),
    ])
    const company = companies.find((item) => item.id === input.companyId)
    if (!company) return { success: false, error: 'Office introuvable.' }

    const contact = input.contactId ? contacts.find((item) => item.id === input.contactId && item.companyId === company.id && item.decisionMaker && !!item.email) : null
    if (input.contactId && !contact) return { success: false, error: 'Le destinataire sélectionné a changé. Actualisez la page.' }
    const email = contact?.email ?? company.email
    if (!email) return { success: false, error: 'Cet office n’a aucun email exploitable pour l’aperçu.' }

    const normalizedEmail = email.trim().toLowerCase()
    const blocked = suppressions.some((item) => item.active && (
      (item.scope === 'EMAIL' && item.email.toLowerCase() === normalizedEmail) ||
      (item.scope === 'COMPANY' && item.companyId === company.id) ||
      (item.scope === 'CONTACT' && !!contact?.id && item.contactId === contact.id)
    ))
    if (blocked) return { success: false, error: 'Ce destinataire est exclu des envois email.' }

    await upsertBrevoContact({
      email,
      companyName: company.name,
      firstName: contact?.firstName,
      lastName: contact?.lastName,
    })

    const preview = await previewBrevoTemplate({
      templateId: template.id,
      email,
    })
    return { success: true, preview }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Impossible de générer l'aperçu." }
  }
}

export async function sendCampaignTestAction(templateIdInput: string | number) {
  await getCurrentOwner()
  const sendMode = getBrevoSendMode()
  if (sendMode === 'disabled') {
    return { success: false, error: "Envoi Brevo verrouillé par configuration." }
  }
  const testEmail = getBrevoTestRecipientEmail()
  if (!testEmail) return { success: false, error: "BREVO_TEST_RECIPIENT_EMAIL n'est pas configuré." }
  try {
    const template = await requireActiveTemplate(templateIdInput)
    await sendBrevoTemplateTest(template.id, testEmail)
    return { success: true, email: testEmail }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Échec de l'envoi du test." }
  }
}

export async function createCampaignDraftAction(input: { name: string; subject: string; recipients: { companyId: string; contactId: string | null }[]; includePreviouslySent?: boolean; templateId?: string | number }) {
  const owner = await getCurrentOwner()
  const name = input.name.trim()
  const subject = input.subject.trim()
  if (!name || !subject) return { success: false, error: 'Nom et objet obligatoires.' }
  if (!Array.isArray(input.recipients) || input.recipients.length < 1 || input.recipients.length > 25) return { success: false, error: 'Sélectionnez entre 1 et 25 offices.' }
  if (input.recipients.some((item) => !item || typeof item.companyId !== 'string' || (item.contactId !== null && typeof item.contactId !== 'string'))) {
    return { success: false, error: 'Sélection de destinataires invalide.' }
  }
  if (new Set(input.recipients.map((item) => item.companyId)).size !== input.recipients.length) {
    return { success: false, error: 'Un seul destinataire par office est autorisé.' }
  }

  let templateId: number
  try {
    templateId = (await requireActiveTemplate(input.templateId ?? process.env.BREVO_TEMPLATE_ID ?? '')).id
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Modèle Brevo invalide.' }
  }

  const businessLine = await getBusinessLineByCode('KLS3_NOTAIRES')
  if (!businessLine) return { success: false, error: 'Business line KLS3_NOTAIRES introuvable.' }

  const [companies, contacts, suppressions, targets, activities, recipients, campaigns] = await Promise.all([
    getCompanies({ maxRecords: 2000 }), getContacts({ maxRecords: 5000 }), getEmailSuppressions(),
    getColdCallTargets(), getActivities(), getEmailRecipients(), getEmailCampaigns(),
  ])
  const audience = buildCampaignAudience({ companies, contacts, suppressions, targets, activities, recipients, campaigns,
    businessLineId: businessLine.id, testEmail: getBrevoTestRecipientEmail() })
  const byCompany = new Map(audience.map((item) => [item.id, item]))
  const seenEmails = new Set<string>()
  const eligible = [] as { company: (typeof audience)[number]; choice: (typeof audience)[number]['options'][number] }[]
  for (const selected of input.recipients) {
    const company = byCompany.get(selected.companyId)
    const choice = company?.options.find((item) => item.contactId === selected.contactId)
    if (!company || company.blockedReason || !choice || choice.blockedReason) {
      return { success: false, error: 'Un destinataire est exclu ou a changé. Actualisez la liste.' }
    }
    if (company.previouslySent && !input.includePreviouslySent) {
      return { success: false, error: 'Un office a déjà reçu une campagne. Activez explicitement son inclusion si nécessaire.' }
    }
    const email = choice.email.toLowerCase()
    if (seenEmails.has(email)) return { success: false, error: `Adresse en doublon : ${email}. Choisissez un autre destinataire.` }
    seenEmails.add(email)
    eligible.push({ company, choice })
  }
  const sendMode = getBrevoSendMode()
  if (sendMode === 'test') {
    const testEmail = getBrevoTestRecipientEmail()
    if (!testEmail) return { success: false, error: "BREVO_TEST_RECIPIENT_EMAIL n'est pas configuré." }
    if (eligible.length !== 1 || eligible[0].choice.email.toLowerCase() !== testEmail) {
      return { success: false, error: `Mode test : le brouillon doit contenir uniquement ${testEmail}.` }
    }
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? ''
  const senderName = process.env.BREVO_SENDER_NAME ?? 'KLS3'
  const replyTo = process.env.BREVO_REPLY_TO ?? senderEmail
  if (!senderEmail) return { success: false, error: "BREVO_SENDER_EMAIL n'est pas configuré." }

  const campaign = await createEmailCampaign({ name, subject, businessLineId: businessLine.id, senderName, senderEmail, replyTo, templateId: String(templateId), recipientCount: eligible.length, createdBy: owner })
  for (const item of eligible) {
    await createEmailRecipient({ name: `${campaign.name} — ${item.company.name}`, campaignId: campaign.id, companyId: item.company.id,
      contactId: item.choice.contactId ?? undefined, email: item.choice.email, recipientType: item.choice.contactId ? 'CONTACT' : 'COMPANY' })
  }
  revalidatePath('/email-campaigns')
  return { success: true, campaignId: campaign.id, recipientCount: eligible.length }
}


export async function markCampaignReplyAction(recipientId: string) {
  const owner = await getCurrentOwner()
  const recipients = await getEmailRecipients()
  const recipient = recipients.find((item) => item.id === recipientId)
  if (!recipient) return { success: false, error: 'Destinataire introuvable.' }
  if (recipient.status === 'REPLIED') return { success: true, alreadyProcessed: true }
  if (!['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(recipient.status)) {
    return { success: false, error: "Une réponse ne peut être enregistrée que pour un email réellement envoyé." }
  }

  const campaign = await getEmailCampaignById(recipient.campaignId)
  const { target } = await findOrCreateProspectingTarget({
    companyId: recipient.companyId,
    contactId: recipient.contactId,
    businessLineId: campaign.businessLineId,
    owner: campaign.createdBy,
    status: 'Email Flow',
  })

  const marker = `[BREVO_REPLY:${recipient.id}]`
  const activities = await getActivities({ maxRecords: 5000 })
  if (!activities.some((activity) => activity.notes?.includes(marker))) {
    await createActivity({
      opportunityId: target.opportunityId ?? undefined,
      contactId: recipient.contactId ?? undefined,
      coldCallTargetId: target.id,
      type: 'EMAIL',
      date: new Date().toISOString(),
      result: 'EMAIL_REPLY',
      notes: `${marker} Réponse email reçue — campagne ${campaign.name}`,
      owner,
    })
  }

  const openTasks = await getTasks({ status: 'TODO' })
  const existingTask = openTasks.find((task) => ['CALL', 'FOLLOW_UP'].includes(task.type) &&
    (task.coldCallTargetId === target.id || (!!recipient.contactId && task.contactId === recipient.contactId)))
  if (existingTask) {
    await updateTask(existingTask.id, { priority: 'URGENT', dueAt: emailReplyFollowUpDueParis().toISOString(),
      notes: `${existingTask.notes ?? ''}\n${marker} Réponse reçue à qualifier — campagne ${campaign.name}.`.trim() })
  } else {
    await createTask({
      opportunityId: target.opportunityId ?? undefined,
      contactId: recipient.contactId ?? undefined,
      coldCallTargetId: target.id,
      type: 'FOLLOW_UP',
      dueAt: emailReplyFollowUpDueParis().toISOString(),
      priority: 'URGENT',
      status: 'TODO',
      notes: `${marker} Réponse email reçue — campagne ${campaign.name}. Lire et qualifier avant de créer une opportunité.`,
      owner: campaign.createdBy,
    })
  }

  await updateEmailRecipient(recipient.id, {
    status: 'REPLIED',
    lastEventAt: new Date().toISOString(),
    prospectingTargetId: target.id,
  })

  revalidatePath('/email-campaigns')
  revalidatePath('/email-campaigns/follow-up')
  revalidatePath('/today')
  revalidatePath('/cold-call')

  return { success: true }
}

export async function sendCampaignAction(campaignId: string) {
  await getCurrentOwner()
  const sendMode = getBrevoSendMode()
  if (sendMode === 'disabled') {
    return { success: false, error: "Envoi Brevo verrouillé. Activez d’abord le mode test dans la configuration." }
  }
  const campaign = await getEmailCampaignById(campaignId)
  if (campaign.status !== 'DRAFT') return { success: false, error: "Cette campagne n'est plus en brouillon." }
  const allRecipients = await getEmailRecipients()
  const readyRecipients = allRecipients.filter((item) => item.campaignId === campaignId && item.status === 'READY')
  const [suppressions, companies, contacts, targets, activities, campaigns] = await Promise.all([
    getEmailSuppressions(), getCompanies({ maxRecords: 2000 }), getContacts({ maxRecords: 5000 }),
    getColdCallTargets(), getActivities(), getEmailCampaigns(),
  ])
  const audience = buildCampaignAudience({ companies, contacts, suppressions, targets, activities, recipients: allRecipients,
    campaigns, businessLineId: campaign.businessLineId, testEmail: getBrevoTestRecipientEmail(), excludeCampaignId: campaignId })
  const byCompany = new Map(audience.map((item) => [item.id, item]))
  const excluded = readyRecipients.map((recipient) => {
    const office = byCompany.get(recipient.companyId)
    const option = office?.options.find((item) => item.email.toLowerCase() === recipient.email.trim().toLowerCase() &&
      (item.contactId === recipient.contactId || (recipient.contactId === null &&
        companies.some((company) => company.id === recipient.companyId && company.email?.trim().toLowerCase() === recipient.email.trim().toLowerCase()))))
    return { recipient, reason: isSuppressed(recipient, suppressions) ? 'Opposition ou désabonnement actif avant envoi'
      : !office || office.blockedReason || !option || option.blockedReason
        ? option?.blockedReason ?? office?.blockedReason ?? 'Destinataire devenu inéligible avant envoi' : null }
  }).filter((item) => !!item.reason)
  await inBatches(excluded, 10, ({ recipient, reason }) => updateEmailRecipient(recipient.id, {
    status: 'EXCLUDED', exclusionReason: reason ?? 'Destinataire exclu avant envoi',
  }))
  const excludedIds = new Set(excluded.map((item) => item.recipient.id))
  const seenEmails = new Set<string>()
  const duplicateRecipients = readyRecipients.filter((recipient) => {
    if (excludedIds.has(recipient.id)) return false
    const email = recipient.email.trim().toLowerCase()
    if (seenEmails.has(email)) return true
    seenEmails.add(email)
    return false
  })
  await inBatches(duplicateRecipients, 10, (recipient) => updateEmailRecipient(recipient.id, {
    status: 'EXCLUDED', exclusionReason: 'Email déjà présent dans cette campagne',
  }))

  const allowedEmails = new Set<string>()
  const recipients = readyRecipients.filter((recipient) => {
    if (excludedIds.has(recipient.id)) return false
    const email = recipient.email.trim().toLowerCase()
    if (allowedEmails.has(email)) return false
    allowedEmails.add(email)
    return true
  })
  if (!recipients.length) return { success: false, error: 'Aucun destinataire autorisé.' }
  if (recipients.length > 25) return { success: false, error: 'Une campagne pilote est limitée à 25 destinataires.' }
  if (sendMode === 'test') {
    const testEmail = getBrevoTestRecipientEmail()
    if (!testEmail) return { success: false, error: "BREVO_TEST_RECIPIENT_EMAIL n'est pas configuré." }
    if (recipients.length !== 1 || recipients[0].email.toLowerCase() !== testEmail) {
      return { success: false, error: `Mode test : la campagne doit contenir uniquement ${testEmail}.` }
    }
  }
  const templateId = parseTemplateId(campaign.templateId ?? process.env.BREVO_TEMPLATE_ID ?? '')
  if (!templateId) return { success: false, error: "Aucun modèle Brevo valide n'est associé à cette campagne." }
  try {
    await requireActiveTemplate(templateId)
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Modèle Brevo invalide.' }
  }

  let sendAttempted = false
  try {
    const listId = await createBrevoList(`${campaign.name} — ${new Date().toISOString().slice(0, 10)}`)
    await inBatches(recipients, 5, async (recipient) => {
      const company = companies.find((item) => item.id === recipient.companyId)
      const contact = contacts.find((item) => item.id === recipient.contactId)
      await upsertBrevoContact({ email: recipient.email, listId, companyName: company?.name ?? '', firstName: contact?.firstName, lastName: contact?.lastName })
    })
    const brevoId = await createBrevoCampaign({ name: campaign.name, subject: campaign.subject, senderName: campaign.senderName, senderEmail: campaign.senderEmail,
      replyTo: campaign.replyTo, templateId, listId })
    await updateEmailCampaign(campaign.id, { brevoCampaignId: String(brevoId), status: 'SCHEDULED' })
    sendAttempted = true
    await sendBrevoCampaignNow(brevoId)
    const sentAt = new Date().toISOString()
    await updateEmailCampaign(campaign.id, { status: 'SENT', sentAt })
    await inBatches(recipients, 10, (recipient) => updateEmailRecipient(recipient.id, { status: 'SENT', lastEventAt: sentAt }))
    revalidatePath('/email-campaigns')
    return { success: true, warning: excluded.length || duplicateRecipients.length
      ? `Campagne envoyée à ${recipients.length} destinataire(s). ${excluded.length + duplicateRecipients.length} exclu(s) après la création du brouillon.`
      : `Campagne envoyée à ${recipients.length} destinataire(s).` }
  } catch (error) {
    console.error('Brevo send failed:', error)
    if (sendAttempted) {
      return {
        success: true,
        warning: "L’envoi a été soumis à Brevo mais sa confirmation est ambiguë. La campagne reste verrouillée pour éviter tout double envoi.",
      }
    }
    await updateEmailCampaign(campaign.id, { status: 'FAILED' })
    return { success: false, error: error instanceof Error ? error.message : "Échec de l'envoi Brevo" }
  }
}
