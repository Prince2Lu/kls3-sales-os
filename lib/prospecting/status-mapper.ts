// Prospecting Status Mapper
// Maps legacy CallStatus to new ProspectingStatus and vice versa
// Used during migration period for backward compatibility

import type { ProspectingStatus } from '@/types/domain'

// Legacy CallStatus type (for reference)
type LegacyCallStatus =
  | 'À appeler'
  | 'À rappeler'
  | 'Email Flow'
  | 'Mauvais numéro'
  | 'Pas intéressé'
  | 'RDV booké'

/**
 * Map legacy CallStatus to new ProspectingStatus
 * Used when reading existing Airtable data
 */
export function mapLegacyToProspecting(
  legacyStatus: string
): ProspectingStatus {
  switch (legacyStatus) {
    case 'À appeler':
      return 'À contacter'
    case 'À rappeler':
      return 'Relance prévue'
    case 'Email Flow':
      return 'En séquence'
    case 'Mauvais numéro':
      return 'Non joignable'
    case 'Pas intéressé':
      return 'Hors cible'
    case 'RDV booké':
      return 'Converti'
    default:
      // If already new format, return as-is
      return legacyStatus as ProspectingStatus
  }
}

/**
 * Map new ProspectingStatus to legacy CallStatus
 * Used when writing to Airtable during migration period
 *
 * DECISION: Option A (Map to legacy) implemented
 *
 * Why Option A:
 * - Airtable Single Select currently ONLY contains legacy values ('À appeler', 'À rappeler', etc.)
 * - Writing new values ('À contacter') would cause Airtable API errors
 * - This mapper ensures write compatibility
 *
 * Future migration path to Option B (write new values directly):
 * 1. Update Airtable COLD_CALL_TARGETS.Call Status Single Select options:
 *    - Rename 'À appeler' → 'À contacter'
 *    - Rename 'À rappeler' → 'Relance prévue'
 *    - Rename 'Email Flow' → 'En séquence'
 *    - Rename 'Mauvais numéro' → 'Non joignable'
 *    - Rename 'Pas intéressé' → 'Hors cible'
 *    - Rename 'RDV booké' → 'Converti'
 * 2. Remove this mapper (return status directly)
 * 3. Remove mapLegacyToProspecting from read path
 */
export function mapProspectingToLegacy(
  status: ProspectingStatus
): LegacyCallStatus {
  switch (status) {
    case 'À contacter':
      return 'À appeler'
    case 'Relance prévue':
      return 'À rappeler'
    case 'En séquence':
      return 'Email Flow'
    case 'Non joignable':
      return 'Mauvais numéro'
    case 'Hors cible':
      return 'Pas intéressé'
    case 'Converti':
      return 'RDV booké'
  }
}

/**
 * Get all valid ProspectingStatus values
 */
export function getAllProspectingStatuses(): readonly ProspectingStatus[] {
  return [
    'À contacter',
    'Relance prévue',
    'En séquence',
    'Non joignable',
    'Hors cible',
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
