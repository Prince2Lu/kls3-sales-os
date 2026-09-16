// Prospecting Target Manager
// Central anti-duplicate logic for ProspectingTargets
// BUSINESS RULE: Unique key = Company + Business Line + Contact

import {
  getColdCallTargets,
  createColdCallTarget,
  updateColdCallTarget,
  type CreateColdCallTargetInput,
} from '@/lib/airtable'
import type { ColdCallTarget, Owner, ProspectingStatus } from '@/types/domain'

export type TargetAction = 'CREATE_NEW' | 'REUSE_EXISTING' | 'ENRICH_CONTACTLESS_TARGET'

export interface FindOrPrepareResult {
  action: TargetAction
  target?: ColdCallTarget
  message: string
}

export interface PrepareTargetInput {
  companyId: string
  businessLineId: string
  contactId?: string | null
  owner: Owner
  status?: ProspectingStatus
}

/**
 * Find or prepare a ProspectingTarget (anti-duplicate logic)
 *
 * ANTI-DUPLICATE RULE:
 * - Unique key: Company + Business Line + Contact
 * - Contact = null is a valid unique key component
 *
 * BUSINESS RULES:
 *
 * 1. Exact match (Company + BL + Contact)
 *    → REUSE_EXISTING (regardless of status, even if Converti/RDV booké/has Opportunity)
 *
 * 2. Contactless target exists (Company + BL + Contact=null)
 *    AND we're adding a specific contact
 *    → ENRICH_CONTACTLESS_TARGET (update existing target with contact)
 *
 * 3. No match
 *    → CREATE_NEW
 *
 * IMPORTANT:
 * - Status is NOT part of unique key
 * - Existing Opportunity is NOT modified
 * - Existing status is NOT reset (unless explicitly requested)
 *
 * @param input Company, Business Line, Contact, Owner, Status
 * @returns Action to take and optional existing target
 */
export async function findOrPrepareProspectingTarget(
  input: PrepareTargetInput
): Promise<FindOrPrepareResult> {
  const { companyId, businessLineId, contactId, owner, status } = input

  // Normalize contactId (undefined → null)
  const normalizedContactId = contactId || null

  // Fetch all existing targets for this Business Line
  const existingTargets = await getColdCallTargets({
    businessLineId,
  })

  // Filter targets for this company
  const companyTargets = existingTargets.filter(
    (t) => t.companyId === companyId
  )

  if (companyTargets.length === 0) {
    // No targets for this company + BL → CREATE_NEW
    return {
      action: 'CREATE_NEW',
      message: 'Aucun target existant pour cette entreprise et Business Line',
    }
  }

  // RULE 1: Check for exact match (Company + BL + Contact)
  const exactMatch = companyTargets.find(
    (t) => t.contactId === normalizedContactId
  )

  if (exactMatch) {
    // Exact match found → REUSE_EXISTING
    let statusInfo = `Statut: ${exactMatch.callStatus}`
    if (exactMatch.opportunityId) {
      statusInfo += ` (lié à une Opportunity)`
    }

    return {
      action: 'REUSE_EXISTING',
      target: exactMatch,
      message: `Target existant trouvé. ${statusInfo}`,
    }
  }

  // RULE 2: Check for contactless target if we're adding a specific contact
  if (normalizedContactId !== null) {
    const contactlessTarget = companyTargets.find((t) => t.contactId === null)

    if (contactlessTarget) {
      // Contactless target exists + we're adding contact → ENRICH_CONTACTLESS_TARGET
      return {
        action: 'ENRICH_CONTACTLESS_TARGET',
        target: contactlessTarget,
        message: `Target sans contact trouvé. Il sera enrichi avec ce contact.`,
      }
    }
  }

  // RULE 3: No match → CREATE_NEW
  // (different contact or contactless target when contact-specific targets exist)
  return {
    action: 'CREATE_NEW',
    message: 'Nouveau target (contact différent ou configuration compatible)',
  }
}

/**
 * Execute the target preparation action
 *
 * Based on findOrPrepareProspectingTarget result:
 * - CREATE_NEW: creates new target
 * - REUSE_EXISTING: returns existing target (no modification)
 * - ENRICH_CONTACTLESS_TARGET: updates contactless target with contact
 *
 * @param result Result from findOrPrepareProspectingTarget
 * @param input Original input data
 * @returns Final target (created, reused, or enriched)
 */
export async function executeTargetAction(
  result: FindOrPrepareResult,
  input: PrepareTargetInput
): Promise<ColdCallTarget> {
  const { companyId, businessLineId, contactId, owner, status } = input
  const normalizedContactId = contactId || undefined
  const finalStatus = status || 'À appeler'

  switch (result.action) {
    case 'CREATE_NEW': {
      // Create new target
      const newTarget = await createColdCallTarget({
        companyId,
        businessLineId,
        contactId: normalizedContactId,
        owner,
        callStatus: finalStatus,
      })
      return newTarget
    }

    case 'REUSE_EXISTING': {
      // Return existing target without modification
      // IMPORTANT: Do not reset status, do not touch Opportunity
      if (!result.target) {
        throw new Error('REUSE_EXISTING action requires existing target')
      }
      return result.target
    }

    case 'ENRICH_CONTACTLESS_TARGET': {
      // Update contactless target with contact
      if (!result.target) {
        throw new Error('ENRICH_CONTACTLESS_TARGET action requires existing target')
      }

      const enrichedTarget = await updateColdCallTarget(result.target.id, {
        contactId: normalizedContactId,
        // Keep existing owner, status, opportunity
        // Only update the contact
      })

      return enrichedTarget
    }

    default: {
      throw new Error(`Unknown action: ${result.action}`)
    }
  }
}

/**
 * High-level function: Find or create ProspectingTarget
 *
 * Combines findOrPrepareProspectingTarget + executeTargetAction
 *
 * @param input Company, Business Line, Contact, Owner, Status
 * @returns Target (created, reused, or enriched) and action taken
 */
export async function findOrCreateProspectingTarget(
  input: PrepareTargetInput
): Promise<{ target: ColdCallTarget; action: TargetAction; message: string }> {
  const prepareResult = await findOrPrepareProspectingTarget(input)
  const target = await executeTargetAction(prepareResult, input)

  return {
    target,
    action: prepareResult.action,
    message: prepareResult.message,
  }
}
