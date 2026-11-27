// Owner choices shown in forms. Pure helper, safe in client components.
// The list comes from active USERS (see lib/users/owners.ts); values already
// stored on a record stay selectable even if that user is no longer active.

export function ownerOptions(activeOwners: string[], ...existing: Array<string | null | undefined>): string[] {
  const options = [...activeOwners]
  for (const value of existing) {
    if (value && !options.includes(value)) options.push(value)
  }
  return options
}
