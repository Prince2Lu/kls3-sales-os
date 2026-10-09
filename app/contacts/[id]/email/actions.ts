'use server'

import { revalidatePath } from 'next/cache'
import { createActivity, getCompanyById, getContactById } from '@/lib/airtable'
import { createDirectEmail, updateDirectEmail } from '@/lib/direct-email/data'
import { sendDirectMail } from '@/lib/direct-email/mailer'
import { getCurrentOwner } from '@/lib/utils/current-owner'

export type SendDirectEmailResult = {
  success: boolean
  error?: string
  warning?: string
  cardUrl?: string
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function sendDirectEmailAction(input: {
  contactId: string
  subject: string
  body: string
}): Promise<SendDirectEmailResult> {
  const owner = await getCurrentOwner()
  const subject = input.subject.trim()
  const body = input.body.trim()

  if (!subject) return { success: false, error: 'L’objet du mail est obligatoire.' }
  if (!body) return { success: false, error: 'Le message est obligatoire.' }

  const contact = await getContactById(input.contactId)
  if (!contact.email || !validEmail(contact.email)) {
    return { success: false, error: 'Ce contact ne possède pas d’adresse email directe valide.' }
  }

  const company = contact.companyId
    ? await getCompanyById(contact.companyId).catch(() => null)
    : null

  const cardRef = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  const campaign = `direct-${cardRef.slice(0, 10)}`
  const cardUrl =
    `https://www.kls3-dev.com/carte/${owner.toLowerCase()}` +
    `?src=direct-email&campaign=${encodeURIComponent(campaign)}&ref=${encodeURIComponent(cardRef)}`

  const record = await createDirectEmail({
    contactId: contact.id,
    companyId: company?.id,
    owner,
    toEmail: contact.email,
    subject,
    body,
    cardRef,
    cardUrl,
  })

  try {
    const sent = await sendDirectMail({
      owner,
      toEmail: contact.email,
      subject,
      body,
      cardUrl,
    })

    const sentAt = new Date().toISOString()
    await updateDirectEmail(record.id, {
      status: 'SENT',
      messageId: sent.messageId,
      sentAt,
    })

    let crmWarning = ''
    try {
      await createActivity({
        contactId: contact.id,
        type: 'EMAIL',
        date: sentAt,
        result: 'EMAIL_SENT',
        notes: `Email direct envoyé depuis Sales OS — ${subject} — carte personnalisée ${cardRef}`,
        owner,
      })
    } catch (error) {
      crmWarning = error instanceof Error ? error.message : 'journalisation CRM impossible'
    }

    revalidatePath(`/contacts/${contact.id}`)
    revalidatePath('/digital-cards/stats')

    const warnings = [
      !sent.imapArchived ? `Le mail a bien été envoyé mais n’a pas pu être copié dans Envoyés : ${sent.archiveWarning}` : '',
      crmWarning ? `Activité CRM non créée : ${crmWarning}` : '',
    ].filter(Boolean)

    return {
      success: true,
      cardUrl,
      warning: warnings.length ? warnings.join(' ') : undefined,
    }
  } catch (error) {
    await updateDirectEmail(record.id, { status: 'FAILED' }).catch(() => undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Échec de l’envoi du mail.',
    }
  }
}
