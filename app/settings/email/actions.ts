'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { getMailSettings, saveMailSettings } from '@/lib/mail-settings'
import { testDirectMailConnection } from '@/lib/direct-email/mailer'
import type { Owner } from '@/types/domain'

function asOwner(value: FormDataEntryValue | null): Owner | null {
  return value === 'Eric' || value === 'Lilian' ? value : null
}

async function authorize(owner: Owner) {
  const session = await auth()
  if (!session?.user?.name) throw new Error('Non authentifié.')

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin && session.user.name !== owner) {
    throw new Error('Vous ne pouvez modifier que votre propre messagerie.')
  }
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function integer(formData: FormData, key: string, fallback: number) {
  const value = Number(text(formData, key))
  return Number.isInteger(value) && value > 0 ? value : fallback
}

export async function saveMailSettingsAction(formData: FormData) {
  const owner = asOwner(formData.get('owner'))
  if (!owner) return { success: false, error: 'Propriétaire invalide.' }

  await authorize(owner)

  const fromName = text(formData, 'fromName')
  const fromEmail = text(formData, 'fromEmail').toLowerCase()
  const smtpHost = text(formData, 'smtpHost')
  const smtpUser = text(formData, 'smtpUser')
  const imapHost = text(formData, 'imapHost')
  const imapUser = text(formData, 'imapUser')
  const smtpPassword = text(formData, 'smtpPassword')
  const imapPassword = text(formData, 'imapPassword')
  const sentMailbox = text(formData, 'sentMailbox') || 'Sent'

  if (!fromName || !fromEmail || !smtpHost || !smtpUser || !imapHost || !imapUser) {
    return { success: false, error: 'Tous les champs serveur et identité sont obligatoires.' }
  }

  const existing = await getMailSettings(owner)
  if (!smtpPassword && !existing.smtpPassword) {
    return { success: false, error: 'Le mot de passe SMTP est obligatoire lors de la première configuration.' }
  }

  await saveMailSettings(owner, {
    fromName,
    fromEmail,
    smtpHost,
    smtpPort: integer(formData, 'smtpPort', 465),
    smtpSecure: formData.get('smtpSecure') === 'on',
    smtpUser,
    smtpPassword,
    imapHost,
    imapPort: integer(formData, 'imapPort', 993),
    imapSecure: formData.get('imapSecure') === 'on',
    imapUser,
    imapPassword,
    sentMailbox,
  })

  revalidatePath('/settings/email')
  revalidatePath('/contacts')

  return { success: true }
}

export async function testMailSettingsAction(owner: Owner) {
  await authorize(owner)

  try {
    const result = await testDirectMailConnection(owner)
    return { success: result.smtpOk && result.imapOk, ...result }
  } catch (error) {
    return {
      success: false,
      smtpOk: false,
      imapOk: false,
      smtpMessage: error instanceof Error ? error.message : 'Test impossible.',
      imapMessage: '',
    }
  }
}
