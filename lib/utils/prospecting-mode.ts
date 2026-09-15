// Prospecting Mode utilities
// Helper functions to determine prospecting behavior based on Business Line configuration

import type { BusinessLine, ProspectingMode } from '@/types/domain'

/**
 * Check if a Business Line uses Cold Call prospecting
 */
export function isColdCallBusinessLine(businessLine: BusinessLine): boolean {
  return businessLine.prospectingMode === 'COLD_CALL'
}

/**
 * Check if a Business Line uses Direct Opportunity prospecting
 */
export function isDirectOpportunityBusinessLine(businessLine: BusinessLine): boolean {
  return businessLine.prospectingMode === 'DIRECT_OPPORTUNITY'
}

/**
 * Filter Business Lines by Prospecting Mode
 */
export function filterBusinessLinesByMode(
  businessLines: BusinessLine[],
  mode: ProspectingMode
): BusinessLine[] {
  return businessLines.filter((bl) => bl.prospectingMode === mode)
}

/**
 * Get all Cold Call Business Lines
 */
export function getColdCallBusinessLines(businessLines: BusinessLine[]): BusinessLine[] {
  return filterBusinessLinesByMode(businessLines, 'COLD_CALL')
}

/**
 * Get all Direct Opportunity Business Lines
 */
export function getDirectOpportunityBusinessLines(businessLines: BusinessLine[]): BusinessLine[] {
  return filterBusinessLinesByMode(businessLines, 'DIRECT_OPPORTUNITY')
}
