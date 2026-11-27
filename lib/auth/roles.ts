// Role checks on the server (never on a first name). Roles live in USERS.
import { auth } from '@/auth'

export type Role = 'ADMIN' | 'SALES_DIRECTOR' | 'SALES'

/** Roles allowed to run sensitive actions: import, rollback, campaign send, GDPR export. */
export const MANAGER_ROLES: Role[] = ['ADMIN', 'SALES_DIRECTOR']

export async function currentRole(): Promise<Role | null> {
  const session = await auth()
  const role = session?.user?.role
  return role === 'ADMIN' || role === 'SALES_DIRECTOR' || role === 'SALES' ? role : null
}

/** null when allowed, otherwise a French error message for the user. */
export async function denyUnlessRole(allowed: Role[] = MANAGER_ROLES): Promise<string | null> {
  const role = await currentRole()
  return role && allowed.includes(role) ? null : "Action réservée aux responsables (rôle ADMIN ou SALES_DIRECTOR)."
}
