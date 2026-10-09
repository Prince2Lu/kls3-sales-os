'use server'

import { revalidatePath } from 'next/cache'
import { createActivity, getCompanyById, getContactById } from '@/lib/airtable'
import { createDirectEmail, updateDirectEmail } from '@/lib/direct-email/data'
import { buildDirectMailto } from '@/lib/direct-email/mailer'
import { getCurrentOwner } from '@/lib/utils/current-owner'

export type PrepareDirectEmailResult = {
  success: boolean
  error?: string
  mailto?: string
  recordId?: string
  cardUrl?: string
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function prepareDirectEmailAction(input: {
  contactId: string
  subject: string
  body: string
}): Promise<PrepareDirectEmailResult> {
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

  const mailto = buildDirectMailto({
    owner,
    toEmail: contact.email,
    subject,
    body,
    cardUrl,
  })

  return {
    success: true,
    mailto,
    recordId: record.id,
    cardUrl,
  }
}

export async function confirmDirectEmailSentAction(input: {
  recordId: string
  contactId: string
  subject: string
}) {
  const owner = await getCurrentOwner()
  const sentAt = new Date().toISOString()

  await updateDirectEmail(input.recordId, {
    status: 'SENT',
    sentAt,
  })

  await createActivity({
    contactId: input.contactId,
    type: 'EMAIL',
    date: sentAt,
    result: 'EMAIL_SENT',
    notes: `Email direct envoyé via Thunderbird — ${input.subject.trim()}`,
    owner,
  })

  revalidatePath(`/contacts/${input.contactId}`)
  revalidatePath('/digital-cards/stats')

  return { success: true }
}
