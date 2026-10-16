// Prospecting Conversion Rules
// Determine when a ProspectingTarget should be converted to an Opportunity
// Based on ActivityResult, not ProspectingStatus

import type { ActivityResult, Stage } from '@/types/domain'

/**
 * Check if an activity result requires Opportunity conversion
 *
 * RÈGLE MÉTIER:
 * - NO_ANSWER → reste en prospection
 * - VOICEMAIL → reste en prospection
 * - WRONG_NUMBER → reste en prospection
 * - NOT_INTERESTED → reste en prospection
 * - EMAIL_REQUESTED → reste en prospection (mais créer task)
 * - EMAIL_SENT → reste en prospection (email envoyé, pas de réponse)
 * - LINKEDIN_SENT → reste en prospection (message LinkedIn envoyé, pas de réponse)
 *
 * - CONVERSATION → reste en prospection, statut 'Échange'
 * - CALLBACK → reste en prospection (rappel planifié, pas de contact commercial confirmé)
 * - MEETING_BOOKED → create/reuse Opportunity, stage 'RDV'
 * - EMAIL_REPLY → reste en prospection, statut 'Échange'
 * - LINKEDIN_REPLY → reste en prospection, statut 'Échange'
 */
export function requiresOpportunityConversion(result: ActivityResult): boolean {
  switch (result) {
    // Results that create/reuse Opportunity
    case 'MEETING_BOOKED':
      return true

    // Results that stay in prospecting
    case 'CONVERSATION':
    case 'EMAIL_REPLY':
    case 'LINKEDIN_REPLY':
    case 'NO_ANSWER':
    case 'VOICEMAIL':
    case 'WRONG_NUMBER':
    case 'NOT_INTERESTED':
    case 'EMAIL_REQUESTED':
    case 'CALLBACK':
    case 'EMAIL_SENT':
    case 'LINKEDIN_SENT':
      return false

    default:
      return false
  }
}

/**
 * Get the initial Opportunity stage after conversion
 * Based on the activity result that triggered the conversion
 *
 * RÈGLE MÉTIER:
 * - MEETING_BOOKED → 'RDV'
 * - all other results do not auto-create an Opportunity
 */
export function getInitialOpportunityStage(result: ActivityResult): Stage {
  switch (result) {
    case 'MEETING_BOOKED':
      // RDV booké → créer Opportunity directement en stage RDV
      return 'RDV'

    default:
      // Fallback: Opportunities created by automatic conversion always start at RDV.
      return 'RDV'
  }
}

/**
 * Get the ProspectingTarget status after conversion
 * Based on the activity result that triggered the conversion
 *
 * SEMANTIC DISTINCTION:
 * - MEETING_BOOKED → 'RDV booké' (actual meeting scheduled, Lilian's familiar label)
 * - Other results no longer use automatic conversion
 *
 * UI BEHAVIOR:
 * - Both 'RDV booké' and 'Converti' visible in prospecting board
 * - Provides visual trace of all converted prospects
 * - Lilian maintains complete visibility of prospecting outcomes
 */
export function getConvertedProspectingStatus(result: ActivityResult): 'RDV booké' | 'Converti' {
  switch (result) {
    case 'MEETING_BOOKED':
      // Real meeting booked → 'RDV booké' (Lilian's familiar label)
      return 'RDV booké'

    default:
      return 'Converti'
  }
}
