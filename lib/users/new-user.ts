// "Ajouter un commercial" (admin screen): input checks, kept pure for tests.

export const NEW_USER_ROLES = ['SALES', 'SALES_DIRECTOR'] as const
export type NewUserRole = (typeof NEW_USER_ROLES)[number]

export type NewUserInput = {
  firstName: string
  lastName: string
  email: string
  role: string
  businessLineIds: string[]
}

export type CleanNewUser = {
  name: string
  firstName: string
  lastName: string
  email: string
  role: NewUserRole
  businessLineIds: string[]
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Returns the cleaned user or a French error. `Name` is the first name: it is what
 * Owner / Changed By / Created By hold, so it must be unique among users.
 */
export function validateNewUser(
  input: NewUserInput,
  existing: { name: string; email: string }[],
  knownBusinessLineIds: string[]
): { ok: true; user: CleanNewUser } | { ok: false; error: string } {
  const firstName = (input.firstName ?? '').trim()
  const lastName = (input.lastName ?? '').trim()
  const email = (input.email ?? '').trim().toLowerCase()
  if (!firstName) return { ok: false, error: 'Le prénom est obligatoire.' }
  if (firstName.length > 40) return { ok: false, error: 'Prénom trop long.' }
  if (!EMAIL.test(email)) return { ok: false, error: 'Adresse email invalide.' }
  if (!NEW_USER_ROLES.includes(input.role as NewUserRole)) return { ok: false, error: 'Rôle invalide.' }
  if (existing.some((u) => u.email?.toLowerCase() === email)) {
    return { ok: false, error: 'Un utilisateur existe déjà avec cet email.' }
  }
  if (existing.some((u) => u.name?.toLowerCase() === firstName.toLowerCase())) {
    return {
      ok: false,
      error: `« ${firstName} » est déjà utilisé comme nom d'utilisateur. Ajoutez l'initiale du nom (ex. ${firstName} ${lastName.charAt(0).toUpperCase() || 'D'}.).`,
    }
  }
  const known = new Set(knownBusinessLineIds)
  const businessLineIds = [...new Set(input.businessLineIds ?? [])].filter((id) => known.has(id))
  return {
    ok: true,
    user: { name: firstName, firstName, lastName, email, role: input.role as NewUserRole, businessLineIds },
  }
}

/** Readable temporary password (no 0/O/1/l), shown once to the admin. */
export function temporaryPassword(randomBytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from(randomBytes, (b) => alphabet[b % alphabet.length]).join('')
}
