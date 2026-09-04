// Current owner context for KLS3 Sales OS
// Maps authenticated session user to Sales OS Owner type

import { auth } from '@/auth'
import type { Owner } from '@/types/domain'

const VALID_OWNERS: Owner[] = ['Eric', 'Lilian']

/**
 * Get the current authenticated user's Owner mapping
 * Phase 8: Maps session.user.name to Owner type
 *
 * @throws Error if no authenticated session or user not mapped to valid Owner
 * @returns Owner ('Eric' | 'Lilian')
 */
export async function getCurrentOwner(): Promise<Owner> {
  const session = await auth()

  if (!session?.user?.name) {
    throw new Error('No authenticated user session')
  }

  const userName = session.user.name

  if (!VALID_OWNERS.includes(userName as Owner)) {
    throw new Error(`User "${userName}" is not mapped to a valid Sales OS owner`)
  }

  return userName as Owner
}

/**
 * Get the current owner's display name
 */
export async function getCurrentOwnerDisplayName(): Promise<string> {
  const owner = await getCurrentOwner()
  return owner
}
