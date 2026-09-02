// Business Line filtering utilities for Today/Focus
// URL-based Business Line context for operational workflows

import type { BusinessLine, Opportunity, Task } from '@/types/domain'

/**
 * Valid Business Line codes
 */
export const BUSINESS_LINE_CODES = ['PAUL', 'SACHA', 'CALYMIA', 'KLS3_NOTAIRES'] as const
export type BusinessLineCode = typeof BUSINESS_LINE_CODES[number]

/**
 * Parse and validate Business Line code from URL parameter
 * Returns null for 'Toutes' (no filter)
 * Returns validated code or null if invalid
 */
export function parseBusinessLineParam(param: string | undefined | null): BusinessLineCode | null {
  if (!param) return null

  const upperParam = param.toUpperCase()
  if (BUSINESS_LINE_CODES.includes(upperParam as BusinessLineCode)) {
    return upperParam as BusinessLineCode
  }

  return null // Invalid code falls back to Toutes
}

/**
 * Find Business Line by code
 */
export function findBusinessLineByCode(
  businessLines: BusinessLine[],
  code: BusinessLineCode | null
): BusinessLine | null {
  if (!code) return null
  return businessLines.find((bl) => bl.code === code) || null
}

/**
 * Check if opportunity belongs to selected Business Line
 */
export function matchesBusinessLine(
  opportunity: Opportunity | null | undefined,
  businessLines: BusinessLine[],
  selectedCode: BusinessLineCode | null
): boolean {
  // No filter: all opportunities match
  if (!selectedCode) return true

  // No opportunity: doesn't match
  if (!opportunity) return false

  // Find selected BL and compare
  const selectedBL = findBusinessLineByCode(businessLines, selectedCode)
  if (!selectedBL) return true // Fallback to Toutes if BL not found

  return opportunity.businessLineId === selectedBL.id
}

/**
 * Filter opportunities by Business Line code
 */
export function filterOpportunitiesByBusinessLine(
  opportunities: Opportunity[],
  businessLines: BusinessLine[],
  code: BusinessLineCode | null
): Opportunity[] {
  if (!code) return opportunities

  const selectedBL = findBusinessLineByCode(businessLines, code)
  if (!selectedBL) return opportunities

  return opportunities.filter((opp) => opp.businessLineId === selectedBL.id)
}

/**
 * Filter tasks by Business Line (via their linked opportunity)
 */
export function filterTasksByBusinessLine(
  tasks: Task[],
  opportunities: Opportunity[],
  businessLines: BusinessLine[],
  code: BusinessLineCode | null
): Task[] {
  if (!code) return tasks

  const selectedBL = findBusinessLineByCode(businessLines, code)
  if (!selectedBL) return tasks

  // Create opportunity ID set for efficient lookup
  const filteredOppIds = new Set(
    opportunities
      .filter((opp) => opp.businessLineId === selectedBL.id)
      .map((opp) => opp.id)
  )

  return tasks.filter((task) => {
    if (!task.opportunityId) return false // Tasks without opportunity excluded when filtered
    return filteredOppIds.has(task.opportunityId)
  })
}

/**
 * Build URL with Business Line parameter
 */
export function buildUrlWithBusinessLine(
  basePath: string,
  code: BusinessLineCode | null
): string {
  if (!code) return basePath
  return `${basePath}?businessLine=${code}`
}
