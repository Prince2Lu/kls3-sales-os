// Server side of the Business Line scope (Trello #4, part 1).

import { auth } from '@/auth'
import { getColdCallTargetById, getOpportunityById, getUserByEmail } from '@/lib/airtable'
import { currentRole } from '@/lib/auth/roles'
import { OUT_OF_SCOPE_MESSAGE, isBusinessLineAllowed, scopeFor, type BusinessLineScope } from '@/lib/auth/business-line-scope'

export async function currentBusinessLineScope(): Promise<BusinessLineScope> {
  const role = await currentRole()
  if (role !== 'SALES') return { all: true }
  const session = await auth()
  const email = session?.user?.email
  // A SALES session without a USERS row is refused elsewhere; here it gets no extra right.
  const user = email ? await getUserByEmail(email) : null
  return scopeFor(role, user?.businessLineIds ?? [])
}

/** Throws a French message when the business line is outside the user's scope. */
export async function assertBusinessLineInScope(businessLineId: string | null | undefined): Promise<void> {
  if (!businessLineId) return
  const scope = await currentBusinessLineScope()
  if (!isBusinessLineAllowed(scope, businessLineId)) throw new Error(OUT_OF_SCOPE_MESSAGE)
}

export async function assertOpportunityInScope(opportunityId: string): Promise<void> {
  const scope = await currentBusinessLineScope()
  if (scope.all) return
  const opportunity = await getOpportunityById(opportunityId)
  if (!isBusinessLineAllowed(scope, opportunity.businessLineId)) throw new Error(OUT_OF_SCOPE_MESSAGE)
}

export async function assertTargetInScope(targetId: string): Promise<void> {
  const scope = await currentBusinessLineScope()
  if (scope.all) return
  const target = await getColdCallTargetById(targetId)
  if (!isBusinessLineAllowed(scope, target.businessLineId)) throw new Error(OUT_OF_SCOPE_MESSAGE)
}
