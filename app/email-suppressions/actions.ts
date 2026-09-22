'use server'

import { revalidatePath } from 'next/cache'
import { createEmailSuppression, getCompanies, getContacts, setEmailSuppressionActive } from '@/lib/airtable'
import type { EmailSuppressionReason } from '@/types/domain'
import { getCurrentOwner } from '@/lib/utils/current-owner'

const REASONS: EmailSuppressionReason[] = ['OPPOSED', 'UNSUBSCRIBED', 'HARD_BOUNCE', 'SPAM_COMPLAINT', 'INVALID_EMAIL', 'MANUAL']

export async function createManualSuppressionAction(input: {
  scope: 'EMAIL' | 'COMPANY' | 'CONTACT'
  email?: string
  companyId?: string
  contactId?: string
  reason: EmailSuppressionReason
  details?: string
}) {
  await getCurrentOwner()
  if (!REASONS.includes(input.reason)) return { success: false, error: 'Motif invalide.' }

  const [companies, contacts] = await Promise.all([
    getCompanies({ maxRecords: 2000 }),
    getContacts({ maxRecords: 5000 }),
  ])
  const company = input.companyId ? companies.find((item) => item.id === input.companyId) : undefined
  const contact = input.contactId ? contacts.find((item) => item.id === input.contactId) : undefined
  if (input.scope === 'COMPANY' && !company) return { success: false, error: 'Entreprise obligatoire.' }
  if (input.scope === 'CONTACT' && !contact) return { success: false, error: 'Contact obligatoire.' }

  const email = (input.email || contact?.email || company?.email || '').trim().toLowerCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { success: false, error: 'Adresse email valide obligatoire.' }

  await createEmailSuppression({
    email,
    companyId: input.scope === 'COMPANY' ? company?.id : contact?.companyId ?? company?.id,
    contactId: input.scope === 'CONTACT' ? contact?.id : undefined,
    scope: input.scope,
    reason: input.reason,
    source: 'CRM',
    details: input.details?.trim() || 'Opposition enregistrée manuellement dans le CRM',
  })
  revalidatePath('/email-suppressions')
  revalidatePath('/email-campaigns')
  return { success: true }
}

export async function reactivateSuppressionAction(id: string) {
  await getCurrentOwner()
  if (!id) return { success: false, error: 'Exclusion introuvable.' }
  await setEmailSuppressionActive(id, true)
  revalidatePath('/email-suppressions')
  revalidatePath('/email-campaigns')
  return { success: true }
}
