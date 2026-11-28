// Business Line filtering utilities for Today/Focus
// URL-based Business Line context for operational workflows

import type { BusinessLine, Opportunity, Task, ColdCallTarget } from '@/types/domain'

/**
 * Business Line code as stored in Airtable BUSINESS_LINES.Code.
 * Any code is accepted: the list of lines comes from Airtable, not from the code (#27).
 */
export type BusinessLineCode = string

const BUSINESS_LINE_CODE_PATTERN = /^[A-Z0-9_]{1,40}$/

/**
 * Parse a Business Line code from a URL parameter.
 * Returns null for 'Toutes' (no filter) or a malformed value.
 * An unknown but well-formed code also falls back to 'Toutes' later, in findBusinessLineByCode.
 */
export function parseBusinessLineParam(param: string | undefined | null): BusinessLineCode | null {
  if (!param) return null

  const upperParam = param.toUpperCase()
  return BUSINESS_LINE_CODE_PATTERN.test(upperParam) ? upperParam : null
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
  code: BusinessLineCode | null,
  targets: ColdCallTarget[] = []
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
  const filteredTargetIds = new Set(targets.filter((target) => target.businessLineId === selectedBL.id).map((target) => target.id))

  return tasks.filter((task) => {
    if (task.opportunityId) return filteredOppIds.has(task.opportunityId)
    if (task.coldCallTargetId) return filteredTargetIds.has(task.coldCallTargetId)
    return false
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
