// Business Line scope per user (Trello #4, part 1).
// ADMIN and SALES_DIRECTOR see every business line. A SALES user is limited to
// the business lines linked in USERS."Business Lines"; an empty or missing field
// means every business line, so nothing changes until the field is filled.
// Checked on the server only: the UI filtering comes in part 2.

import type { Role } from '@/lib/auth/roles'

export type BusinessLineScope = { all: true } | { all: false; ids: ReadonlySet<string> }

export const OUT_OF_SCOPE_MESSAGE = "Cette business line ne fait pas partie de votre périmètre."

export function scopeFor(role: Role | null, businessLineIds: readonly string[] | null | undefined): BusinessLineScope {
  if (role !== 'SALES') return { all: true }
  const ids = (businessLineIds ?? []).filter(Boolean)
  return ids.length ? { all: false, ids: new Set(ids) } : { all: true }
}

/** A record without a business line stays reachable: there is nothing to compare. */
export function isBusinessLineAllowed(scope: BusinessLineScope, businessLineId: string | null | undefined): boolean {
  if (scope.all || !businessLineId) return true
  return scope.ids.has(businessLineId)
}

export function filterByScope<T extends { businessLineId?: string | null }>(scope: BusinessLineScope, rows: T[]): T[] {
  return scope.all ? rows : rows.filter((row) => isBusinessLineAllowed(scope, row.businessLineId))
}
