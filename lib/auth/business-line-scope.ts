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

type Linked = { opportunityId?: string | null; coldCallTargetId?: string | null }
type WithBl = { businessLineId?: string | null }

export type ScopableCrmData = {
  businessLines?: { id: string }[]
  opportunities?: (WithBl & { id: string })[]
  coldCallTargets?: (WithBl & { id: string })[]
  valueEvents?: WithBl[]
  goals?: WithBl[]
  tasks?: Linked[]
  activities?: Linked[]
  stageHistory?: Linked[]
}

/**
 * Trello #4 part 2: keeps only the rows of the user's business lines.
 * Tasks and activities follow their opportunity or prospecting target; one linked
 * to neither (contact-only) stays visible. Companies and contacts are not filtered.
 */
export function scopeCrmData<T extends ScopableCrmData>(scope: BusinessLineScope, data: T): T {
  if (scope.all) return data
  const blOf = new Map<string, string | null | undefined>()
  for (const row of data.opportunities ?? []) blOf.set(`o:${row.id}`, row.businessLineId)
  for (const row of data.coldCallTargets ?? []) blOf.set(`t:${row.id}`, row.businessLineId)

  const linkedAllowed = (row: Linked) => {
    if (row.opportunityId && blOf.has(`o:${row.opportunityId}`)) return isBusinessLineAllowed(scope, blOf.get(`o:${row.opportunityId}`))
    if (row.coldCallTargetId && blOf.has(`t:${row.coldCallTargetId}`)) return isBusinessLineAllowed(scope, blOf.get(`t:${row.coldCallTargetId}`))
    return true
  }

  const out = { ...data }
  if (data.businessLines) out.businessLines = data.businessLines.filter((line) => isBusinessLineAllowed(scope, line.id))
  if (data.opportunities) out.opportunities = filterByScope(scope, data.opportunities)
  if (data.coldCallTargets) out.coldCallTargets = filterByScope(scope, data.coldCallTargets)
  if (data.valueEvents) out.valueEvents = filterByScope(scope, data.valueEvents)
  if (data.goals) out.goals = filterByScope(scope, data.goals)
  if (data.tasks) out.tasks = data.tasks.filter(linkedAllowed)
  if (data.activities) out.activities = data.activities.filter(linkedAllowed)
  if (data.stageHistory) out.stageHistory = data.stageHistory.filter(linkedAllowed)
  return out
}
