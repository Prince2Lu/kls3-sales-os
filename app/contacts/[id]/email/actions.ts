'use server'

import { revalidatePath } from 'next/cache'
import { createActivity, getCompanyById, getContactById } from '@/lib/airtable'
import { createDirectEmail, updateDirectEmail } from '@/lib/direct-email/data'
import { sendDirectMail } from '@/lib/direct-email/mailer'
import { getCurrentOwner } from '@/lib/utils/current-owner'

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_SIZE = 3 * 1024 * 1024

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export type SendDirectEmailResult = {
  success: boolean
  error?: string
  warning?: string
  cardUrl?: string
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function sanitizeHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
    .replace(/javascript\s*:/gi, '')
}

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function sendDirectEmailAction(
  formData: FormData
): Promise<SendDirectEmailResult> {
  const owner = await getCurrentOwner()

  const contactId = cleanText(formData.get('contactId'))
  const subject = cleanText(formData.get('subject'))
  const bodyText = cleanText(formData.get('bodyText'))
  const bodyHtml = sanitizeHtml(cleanText(formData.get('bodyHtml')))

  if (!contactId) return { success: false, error: 'Contact manquant.' }
  if (!subject) return { success: false, error: 'L’objet du mail est obligatoire.' }
  if (!bodyText || !bodyHtml) {
    return { success: false, error: 'Le message est obligatoire.' }
  }

  const contact = await getContactById(contactId)
  if (!contact.email || !validEmail(contact.email)) {
    return {
      success: false,
      error: 'Ce contact ne possède pas d’adresse email directe valide.',
    }
  }

  const files = formData
    .getAll('attachments')
    .filter((item): item is File => item instanceof File && item.size > 0)

  if (files.length > MAX_ATTACHMENTS) {
    return {
      success: false,
      error: `Maximum ${MAX_ATTACHMENTS} pièces jointes par mail.`,
    }
  }

  let totalSize = 0
  for (const file of files) {
    totalSize += file.size

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return {
        success: false,
        error: `${file.name} dépasse 2 Mo.`,
      }
    }

    if (file.type && !ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return {
        success: false,
        error: `Type de fichier non autorisé : ${file.name}.`,
      }
    }
  }

  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
    return {
      success: false,
      error: 'Le total des pièces jointes ne peut pas dépasser 3 Mo.',
    }
  }

  const attachments = await Promise.all(
    files.map(async (file) => ({
      filename: file.name.replace(/[\r\n]/g, '').slice(0, 180),
      contentType: file.type || 'application/octet-stream',
      content: Buffer.from(await file.arrayBuffer()),
      size: file.size,
    }))
  )

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
    body: bodyText,
    bodyHtml,
    attachmentsJson: JSON.stringify(
      attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
      }))
    ),
    cardRef,
    cardUrl,
  })

  try {
    const sent = await sendDirectMail({
      owner,
      toEmail: contact.email,
      subject,
      text: bodyText,
      html: bodyHtml,
      cardUrl,
      attachments: attachments.map(({ filename, contentType, content }) => ({
        filename,
        contentType,
        content,
      })),
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
        notes: `Email direct envoyé depuis Sales OS — ${subject} — carte personnalisée ${cardRef}`,
        owner,
      })
    } catch (error) {
      crmWarning =
        error instanceof Error ? error.message : 'journalisation CRM impossible'
    }

    revalidatePath(`/contacts/${contact.id}`)
    revalidatePath('/digital-cards/stats')

    const warnings = [
      !sent.imapArchived
        ? `Mail envoyé, mais copie dans Envoyés impossible : ${sent.archiveWarning}`
        : '',
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
