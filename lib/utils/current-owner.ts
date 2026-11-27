// Current owner context for KLS3 Sales OS
// Maps the authenticated session user to the Sales OS Owner (the user's name in USERS)

import { auth } from '@/auth'
import type { Owner } from '@/types/domain'

/**
 * Get the current authenticated user's Owner (Trello #53: no hardcoded names).
 * The session is only issued to an active USERS row at sign-in, so the session
 * name is the owner. Adding a salesperson needs no code change.
 *
 * @throws Error if no authenticated session or the session has no name
 */
export async function getCurrentOwner(): Promise<Owner> {
  // TEST MODE: Allow scripts to set owner via TEST_OWNER env var
  // SECURITY: Only in non-production environments
  if (process.env.NODE_ENV !== 'production' && process.env.TEST_OWNER) {
    return process.env.TEST_OWNER
  }

  const session = await auth()

  if (!session?.user) {
    throw new Error('No authenticated user session')
  }

  const userName = session.user.name?.trim()

  if (!userName) {
    throw new Error('Authenticated user has no name in USERS')
  }

  return userName
}

/**
 * Get the current owner's display name
 */
export async function getCurrentOwnerDisplayName(): Promise<string> {
  return getCurrentOwner()
}
