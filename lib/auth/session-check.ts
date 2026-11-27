// Re-checks the signed-in user against USERS while the session is alive, so a
// user deactivated (or removed) in Airtable loses access within RECHECK_MS
// instead of keeping it until the 8 h JWT expires.

import type { JWT } from 'next-auth/jwt'
import type { User } from '@/types/domain'

export const RECHECK_MS = 15 * 60 * 1000

type SessionToken = JWT & { checkedAt?: number }

/**
 * Returns the token to keep (refreshed name and role), or null to end the session.
 * If Airtable cannot be reached, the session is kept and checked again on the
 * next request: an outage must not log the team out.
 */
export async function recheckSessionUser(
  token: SessionToken,
  getUserByEmail: (email: string) => Promise<User | null>,
  now = Date.now()
): Promise<SessionToken | null> {
  if (!token.email) return null
  if (typeof token.checkedAt === 'number' && now - token.checkedAt < RECHECK_MS) return token

  let user: User | null
  try {
    user = await getUserByEmail(token.email)
  } catch {
    return token
  }
  if (!user || !user.active) return null

  return { ...token, name: user.name, role: user.role, checkedAt: now }
}
