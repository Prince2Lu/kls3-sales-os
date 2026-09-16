// Prospecting Status Configuration
// Defines active prospecting statuses and conversion logic

import type { ProspectingStatus } from '@/types/domain'

/**
 * ARCHITECTURE DECISION:
 *
 * ProspectingStatus uses Lilian's familiar UI labels (legacy values remain primary).
 * No mapping needed - values read/written directly to Airtable.
 *
 * SEMANTIC DISTINCTION:
 * - 'RDV booké' = MEETING_BOOKED only (actual meeting scheduled)
 * - 'Converti' = Generic conversion (EMAIL_REPLY, CONVERSATION without meeting)
 *
 * UI DISPLAY RULES:
 * - Active prospecting board shows ALL 7 statuses (including 'Converti' and 'RDV booké')
 * - 'Converti' visible to maintain visual trace of converted prospects
 * - 'RDV booké' visible to maintain visual trace of confirmed meetings
 */

/**
 * Get all active prospecting statuses (displayed in prospecting board)
 * Includes all 7 statuses for complete visual tracking
 */
export function getActiveProspectingStatuses(): readonly ProspectingStatus[] {
  return [
    'À appeler',
    'À rappeler',
    'Email Flow',
    'Mauvais numéro',
    'Pas intéressé',
    'Converti',
    'RDV booké',
  ] as const
}

/**
 * Get all valid ProspectingStatus values (including technical statuses)
 */
export function getAllProspectingStatuses(): readonly ProspectingStatus[] {
  return [
    'À appeler',
    'À rappeler',
    'Email Flow',
    'Mauvais numéro',
    'Pas intéressé',
    'RDV booké',
    'Converti',
  ] as const
}

/**
 * Get user-friendly label for ProspectingStatus
 */
export function getProspectingStatusLabel(status: ProspectingStatus): string {
  // French labels already embedded in the type
  return status
}
