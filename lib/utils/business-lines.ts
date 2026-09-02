// Business Line derivation utilities
// Derives Business Lines from linked opportunities for Companies and Contacts

import type { Opportunity, BusinessLine } from '@/types/domain'

/**
 * Derives unique Business Line IDs for a company from its opportunities
 */
export function deriveCompanyBusinessLines(
  companyId: string,
  opportunities: Opportunity[]
): string[] {
  const businessLineIds = new Set<string>()

  opportunities.forEach((opp) => {
    if (opp.companyId === companyId) {
      businessLineIds.add(opp.businessLineId)
    }
  })

  return Array.from(businessLineIds)
}

/**
 * Derives unique Business Line IDs for a contact from opportunities where they are primary contact
 */
export function deriveContactBusinessLines(
  contactId: string,
  opportunities: Opportunity[]
): string[] {
  const businessLineIds = new Set<string>()

  opportunities.forEach((opp) => {
    if (opp.primaryContactId === contactId) {
      businessLineIds.add(opp.businessLineId)
    }
  })

  return Array.from(businessLineIds)
}

/**
 * Gets Business Line names from IDs
 */
export function getBusinessLineNames(
  businessLineIds: string[],
  businessLines: BusinessLine[]
): string[] {
  const blMap = Object.fromEntries(businessLines.map((bl) => [bl.id, bl.name]))
  return businessLineIds.map((id) => blMap[id]).filter(Boolean) as string[]
}
