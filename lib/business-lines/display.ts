// Business Line display and behaviour helpers (Trello #27).
// Logic reads the BUSINESS_LINES fields (Revenue Trigger, Revenue Type, Category),
// never the business line code or name, so a new line works without code changes.

import type { BusinessLine, EventType } from '@/types/domain'

/**
 * Code of the business line used by the notary import pilot and the notary email
 * campaigns. These two features are notary-specific by nature; the code lives here
 * so that it is referenced in one place only.
 */
export const NOTARY_BUSINESS_LINE_CODE = 'KLS3_NOTAIRES'

/**
 * Display-only names kept from Production 8.1 (code SACHA is shown as "Leverio").
 * Remove the entry once the Name field in Airtable BUSINESS_LINES says "Leverio".
 */
const DISPLAY_NAME_BY_CODE: Record<string, string> = { SACHA: 'Leverio' }

export function businessLineLabel(line: Pick<BusinessLine, 'code' | 'name'> | null | undefined): string {
  if (!line) return ''
  return DISPLAY_NAME_BY_CODE[line.code] ?? line.name
}

/** Label of the value event that pays a business line, from its Revenue Trigger. */
export function outcomeLabel(trigger: EventType | null | undefined): string {
  switch (trigger) {
    case 'PAID_MEETING':
      return 'RDV rémunérés'
    case 'SIGNED_DEAL':
      return 'Signatures'
    case 'SUBSCRIPTION_STARTED':
      return 'Nouveaux abonnements'
    case 'SIGNED_PROJECT':
      return 'Projets signés'
    default:
      return 'Résultats économiques'
  }
}

/** True when the business line earns recurring revenue (MRR), from its Revenue Type. */
export function isRecurringRevenue(line: Pick<BusinessLine, 'revenueType'> | null | undefined): boolean {
  return line?.revenueType === 'MRR'
}
