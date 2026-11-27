// Sales OS owners come from the USERS table, not from the code (Trello #53).
// Airtable keeps Owner / Changed By / Created By as single selects holding the
// user's name: adding a salesperson = a USERS row + that name as an option of
// those single selects in Airtable.

import { getUsers } from '@/lib/airtable'

/** Names of active users, sorted. Never exposes password hashes. */
export async function getActiveOwners(): Promise<string[]> {
  const users = await getUsers()
  return users
    .filter((user) => user.active && user.name)
    .map((user) => user.name)
    .sort((a, b) => a.localeCompare(b, 'fr'))
}

export async function isValidOwner(name: unknown): Promise<boolean> {
  if (typeof name !== 'string' || !name) return false
  return (await getActiveOwners()).includes(name)
}

/**
 * Server-side guard before writing an owner chosen in a form.
 * Empty means "not provided": the caller keeps its own default.
 */
export async function assertValidOwner(owner: string | null | undefined): Promise<void> {
  if (!owner) return
  if (!(await isValidOwner(owner))) {
    throw new Error(`« ${owner} » n'est pas un utilisateur actif de Sales OS.`)
  }
}
