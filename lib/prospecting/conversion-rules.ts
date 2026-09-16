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
 *
 * - CONVERSATION → create/reuse Opportunity, stage 'Échange'
 * - CALLBACK → create/reuse Opportunity, stage 'Échange' (conversation a eu lieu)
 * - MEETING_BOOKED → create/reuse Opportunity, stage 'RDV' (PAS Échange!)
 * - EMAIL_REPLY → create/reuse Opportunity, stage 'Échange'
 *
 * Future:
 * - LINKEDIN_REPLY → create/reuse Opportunity, stage 'Échange'
 */
export function requiresOpportunityConversion(result: ActivityResult): boolean {
  switch (result) {
    // Results that create/reuse Opportunity
    case 'CONVERSATION':
    case 'MEETING_BOOKED':
    case 'CALLBACK':
    case 'EMAIL_REPLY':
      return true

    // Results that stay in prospecting
    case 'NO_ANSWER':
    case 'VOICEMAIL':
    case 'WRONG_NUMBER':
    case 'NOT_INTERESTED':
    case 'EMAIL_REQUESTED':
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
 * - CONVERSATION → 'Échange'
 * - CALLBACK → 'Échange' (conversation happened)
 * - MEETING_BOOKED → 'RDV' (NOT 'Échange'!)
 * - EMAIL_REPLY → 'Échange' (real contact via email)
 */
export function getInitialOpportunityStage(result: ActivityResult): Stage {
  switch (result) {
    case 'MEETING_BOOKED':
      // RDV booké → créer Opportunity directement en stage RDV
      return 'RDV'

    case 'CONVERSATION':
    case 'CALLBACK':
    case 'EMAIL_REPLY':
      // Conversation, callback, or email reply → créer Opportunity en stage Échange
      return 'Échange'

    default:
      // Fallback (should never happen if requiresOpportunityConversion is checked first)
      return 'Échange'
  }
}

/**
 * Get the ProspectingTarget status after conversion
 * Based on the activity result that triggered the conversion
 *
 * SEMANTIC DISTINCTION:
 * - MEETING_BOOKED → 'RDV booké' (actual meeting scheduled, Lilian's familiar label)
 * - CONVERSATION, EMAIL_REPLY, CALLBACK → 'Converti' (generic conversion, Lilian's familiar label)
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

    case 'CONVERSATION':
    case 'CALLBACK':
    case 'EMAIL_REPLY':
      // Generic conversion → 'Converti' (technical status, exits board)
      return 'Converti'

    default:
      // Fallback
      return 'Converti'
  }
}
