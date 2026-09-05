// Business Line derivation utilities
// Primary Business Line = segmentation principale de l'entreprise

import type { Opportunity, BusinessLine, Company } from '@/types/domain'

/**
 * Returns the Primary Business Line ID for a company
 * This is the source of truth for company segmentation
 */
export function getPrimaryBusinessLine(company: Company): string | null {
  return company.primaryBusinessLineId || null
}

/**
 * Returns Primary Business Line as array (for compatibility)
 * Used for company list/detail display
 */
export function getCompanyBusinessLines(company: Company): string[] {
  return company.primaryBusinessLineId ? [company.primaryBusinessLineId] : []
}

/**
 * Returns all Business Lines associated with a company
 * Includes Primary BL + BLs from opportunities
 * Use only for analytics/reporting, not for primary segmentation display
 */
export function getAllCompanyBusinessLines(
  company: Company,
  opportunities: Opportunity[]
): string[] {
  const businessLineIds: string[] = []

  // 1. Add Primary Business Line first if exists
  if (company.primaryBusinessLineId) {
    businessLineIds.push(company.primaryBusinessLineId)
  }

  // 2. Add Business Lines from opportunities (if not already included)
  opportunities.forEach((opp) => {
    if (opp.companyId === company.id && !businessLineIds.includes(opp.businessLineId)) {
      businessLineIds.push(opp.businessLineId)
    }
  })

  return businessLineIds
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
