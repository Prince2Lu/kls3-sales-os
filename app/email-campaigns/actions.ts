'use server'

import { revalidatePath } from 'next/cache'
import {
  createEmailCampaign, createEmailRecipient, getBusinessLineByCode, getCompanies, getContacts,
  getEmailCampaignById, getEmailRecipients, getEmailSuppressions, updateEmailCampaign, updateEmailRecipient,
} from '@/lib/airtable'
import { createBrevoCampaign, createBrevoList, getBrevoTemplate, sendBrevoCampaignNow, sendBrevoTemplateTest, upsertBrevoContact } from '@/lib/brevo/client'
import { getBrevoSendMode, getBrevoTestRecipientEmail } from '@/lib/prospecting/safety'
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

export async function sendCampaignTestAction(templateIdInput: string | number) {
  await getCurrentOwner()
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

export async function createCampaignDraftAction(input: { name: string; subject: string; companyIds: string[] }) {
  const owner = await getCurrentOwner()
  const name = input.name.trim()
  const subject = input.subject.trim()
  if (!name || !subject) return { success: false, error: 'Nom et objet obligatoires.' }
  if (!Array.isArray(input.companyIds) || input.companyIds.length < 1 || input.companyIds.length > 25) return { success: false, error: 'Sélectionnez entre 1 et 25 offices.' }
  const businessLine = await getBusinessLineByCode('KLS3_NOTAIRES')
  if (!businessLine) return { success: false, error: 'Business line KLS3_NOTAIRES introuvable.' }

  const [companies, contacts, suppressions] = await Promise.all([getCompanies({ maxRecords: 2000 }), getContacts({ maxRecords: 5000 }), getEmailSuppressions()])
  const selectedIds = new Set(input.companyIds)
  const eligible = companies.filter((company) => company.primaryBusinessLineId === businessLine.id && selectedIds.has(company.id)).map((company) => {
    const direct = contacts.find((contact) => contact.companyId === company.id && contact.decisionMaker && !!contact.email)
    const email = direct?.email ?? company.email
    const blocked = !!email && suppressions.some((item) => item.active && (
      (item.scope === 'EMAIL' && item.email.toLowerCase() === email.toLowerCase()) ||
      (item.scope === 'COMPANY' && item.companyId === company.id) ||
      (item.scope === 'CONTACT' && item.contactId === direct?.id)
    ))
    return { company, direct, email, blocked }
  }).filter((item) => !!item.email).slice(0, 25)

  if (!eligible.length) return { success: false, error: 'Aucun destinataire avec un email exploitable.' }
  const sendMode = getBrevoSendMode()
  if (sendMode === 'test') {
    const testEmail = getBrevoTestRecipientEmail()
    if (!testEmail) return { success: false, error: "BREVO_TEST_RECIPIENT_EMAIL n'est pas configuré." }
    if (eligible.length !== 1 || eligible[0].email?.toLowerCase() !== testEmail) {
      return { success: false, error: `Mode test : le brouillon doit contenir uniquement ${testEmail}.` }
    }
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? ''
  const senderName = process.env.BREVO_SENDER_NAME ?? 'KLS3'
  const replyTo = process.env.BREVO_REPLY_TO ?? senderEmail
  if (!senderEmail) return { success: false, error: "BREVO_SENDER_EMAIL n'est pas configuré." }

  const campaign = await createEmailCampaign({ name, subject, businessLineId: businessLine.id, senderName, senderEmail, replyTo, templateId: process.env.BREVO_TEMPLATE_ID, recipientCount: eligible.length, createdBy: owner })
  for (const item of eligible) {
    await createEmailRecipient({ name: `${campaign.name} — ${item.company.name}`, campaignId: campaign.id, companyId: item.company.id,
      contactId: item.direct?.id, email: item.email!, recipientType: item.direct ? 'CONTACT' : 'COMPANY',
      status: item.blocked ? 'EXCLUDED' : 'READY', exclusionReason: item.blocked ? 'Opposition ou désabonnement actif' : undefined })
  }
  revalidatePath('/email-campaigns')
  return { success: true, campaignId: campaign.id, recipientCount: eligible.length, excluded: eligible.filter((item) => item.blocked).length }
}

export async function sendCampaignAction(campaignId: string) {
  await getCurrentOwner()
  const sendMode = getBrevoSendMode()
  if (sendMode === 'disabled') {
    return { success: false, error: "Envoi Brevo verrouillé. Activez d’abord le mode test dans la configuration." }
  }
  const campaign = await getEmailCampaignById(campaignId)
  if (campaign.status !== 'DRAFT') return { success: false, error: "Cette campagne n'est plus en brouillon." }
  const readyRecipients = (await getEmailRecipients({ campaignId })).filter((item) => item.status === 'READY')
  const suppressions = await getEmailSuppressions()
  const newlySuppressed = readyRecipients.filter((recipient) => isSuppressed(recipient, suppressions))
  await inBatches(newlySuppressed, 10, (recipient) => updateEmailRecipient(recipient.id, {
    status: 'EXCLUDED', exclusionReason: 'Opposition ou désabonnement actif avant envoi',
  }))
  const recipients = readyRecipients.filter((recipient) => !isSuppressed(recipient, suppressions))
  if (!recipients.length) return { success: false, error: 'Aucun destinataire autorisé.' }
  if (recipients.length > 25) return { success: false, error: 'Une campagne pilote est limitée à 25 destinataires.' }
  if (sendMode === 'test') {
    const testEmail = getBrevoTestRecipientEmail()
    if (!testEmail) return { success: false, error: "BREVO_TEST_RECIPIENT_EMAIL n'est pas configuré." }
    if (recipients.length !== 1 || recipients[0].email.toLowerCase() !== testEmail) {
      return { success: false, error: `Mode test : la campagne doit contenir uniquement ${testEmail}.` }
    }
  }
  const templateId = Number(campaign.templateId ?? process.env.BREVO_TEMPLATE_ID)
  if (!Number.isFinite(templateId)) return { success: false, error: "BREVO_TEMPLATE_ID n'est pas configuré." }

  let submittedToBrevo = false
  try {
    const companies = await getCompanies({ maxRecords: 2000 })
    const contacts = await getContacts({ maxRecords: 5000 })
    const listId = await createBrevoList(`${campaign.name} — ${new Date().toISOString().slice(0, 10)}`)
    await inBatches(recipients, 5, async (recipient) => {
      const company = companies.find((item) => item.id === recipient.companyId)
      const contact = contacts.find((item) => item.id === recipient.contactId)
      await upsertBrevoContact({ email: recipient.email, listId, companyName: company?.name ?? '', firstName: contact?.firstName, lastName: contact?.lastName })
    })
    const brevoId = await createBrevoCampaign({ name: campaign.name, subject: campaign.subject, senderName: campaign.senderName, senderEmail: campaign.senderEmail,
      replyTo: campaign.replyTo, templateId, listId })
    await updateEmailCampaign(campaign.id, { brevoCampaignId: String(brevoId), status: 'SCHEDULED' })
    await sendBrevoCampaignNow(brevoId)
    submittedToBrevo = true
    const sentAt = new Date().toISOString()
    await updateEmailCampaign(campaign.id, { status: 'SENT', sentAt })
    await inBatches(recipients, 10, (recipient) => updateEmailRecipient(recipient.id, { status: 'SENT', lastEventAt: sentAt }))
    revalidatePath('/email-campaigns')
    return { success: true }
  } catch (error) {
    console.error('Brevo send failed:', error)
    if (submittedToBrevo) {
      return { success: true, warning: "Brevo a accepté l’envoi, mais la mise à jour complète du CRM a échoué. Ne pas renvoyer la campagne." }
    }
    await updateEmailCampaign(campaign.id, { status: 'FAILED' })
    return { success: false, error: error instanceof Error ? error.message : "Échec de l'envoi Brevo" }
  }
}
