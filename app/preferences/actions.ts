'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import {
  getUserByEmail,
  updateUserPasswordHash,
  updateUserPreferences,
} from '@/lib/airtable'

async function getAuthenticatedUser() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error('Utilisateur non authentifié')

  const user = await getUserByEmail(email)
  if (!user || !user.active) throw new Error('Utilisateur introuvable')
  return user
}

export async function updatePreferencesAction(data: {
  firstName: string
  lastName: string
  theme: 'dark' | 'light' | 'system'
}) {
  try {
    const user = await getAuthenticatedUser()

    await updateUserPreferences(user.id, {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      theme: data.theme,
    })

    revalidatePath('/')
    revalidatePath('/preferences')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

export async function changePasswordAction(data: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}) {
  try {
    if (data.newPassword.length < 8) {
      return { success: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }
    }

    if (data.newPassword !== data.confirmPassword) {
      return { success: false, error: 'La confirmation du mot de passe ne correspond pas.' }
    }

    const user = await getAuthenticatedUser()
    const currentPasswordIsValid = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash
    )

    if (!currentPasswordIsValid) {
      return { success: false, error: 'Le mot de passe actuel est incorrect.' }
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 12)
    await updateUserPasswordHash(user.id, newPasswordHash)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
