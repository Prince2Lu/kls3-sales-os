'use server'

import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { revalidatePath, updateTag } from 'next/cache'
import { AIRTABLE_CACHE_TAGS, createUser, getBusinessLines, getUsers } from '@/lib/airtable'
import { currentRole } from '@/lib/auth/roles'
import { temporaryPassword, validateNewUser, type NewUserInput } from '@/lib/users/new-user'

export async function addSalesUserAction(
  input: NewUserInput
): Promise<{ success: true; name: string; email: string; password: string } | { success: false; error: string }> {
  if ((await currentRole()) !== 'ADMIN') return { success: false, error: 'Action réservée au rôle ADMIN.' }
  try {
    const [users, businessLines] = await Promise.all([getUsers(), getBusinessLines()])
    const checked = validateNewUser(input, users, businessLines.map((bl) => bl.id))
    if (!checked.ok) return { success: false, error: checked.error }

    const password = temporaryPassword(randomBytes(12))
    const passwordHash = await bcrypt.hash(password, 12)
    try {
      await createUser({ ...checked.user, passwordHash })
    } catch (error) {
      if (checked.user.businessLineIds.length && /UNKNOWN_FIELD_NAME|Business Lines/i.test(String(error))) {
        return { success: false, error: "Le champ « Business Lines » n'existe pas encore dans USERS. Créez-le ou laissez les business lines vides." }
      }
      throw error
    }
    updateTag(AIRTABLE_CACHE_TAGS.USERS)
    revalidatePath('/settings/users')
    return { success: true, name: checked.user.name, email: checked.user.email, password }
  } catch {
    return { success: false, error: "La création a échoué. Réessayez ; si ça persiste, vérifiez la table USERS dans Airtable." }
  }
}
