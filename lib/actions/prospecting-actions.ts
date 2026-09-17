'use server'

// Prospecting actions
// Server actions for adding Companies/Contacts to Prospecting
// IMPORTANT: Uses central anti-duplicate logic from target-manager.ts

import { getCurrentOwner } from '@/lib/utils/current-owner'
import {
  getCompanyById,
  getContactById,
  getBusinessLineById,
} from '@/lib/airtable'
import {
  findOrCreateProspectingTarget,
  findOrPrepareProspectingTarget,
} from '@/lib/prospecting/target-manager'
import type { Owner, ProspectingStatus } from '@/types/domain'
import { revalidatePath } from 'next/cache'

export interface AddToProspectingInput {
  companyId: string
  contactId?: string
  businessLineId: string
  owner?: Owner // Optional - defaults to current owner
}

export type AddToProspectingAction = 'CREATED' | 'REUSED' | 'ENRICHED' | 'RESTORED'

export interface AddToProspectingResult {
  success: boolean
  action?: AddToProspectingAction
  targetId?: string
  message: string
}

export interface RemoveFromProspectingResult {
  success: boolean
  message: string
}

// Pre-check types
export type ProspectingCheckState =
  | 'NEW'
  | 'EXISTING'
  | 'WILL_ENRICH'
  | 'OTHER_CONTACT_EXISTS'
  | 'WILL_RESTORE'

export interface ProspectingCheckInput {
  companyId: string
  businessLineId: string
  contactId?: string
}

export interface ProspectingCheckResult {
  state: ProspectingCheckState
  targetId?: string
  status?: ProspectingStatus
  contactName?: string
  otherContactsCount?: number
}

/**
 * Add Company/Contact to Prospecting
 *
 * Creates a ProspectingTarget using the central anti-duplicate logic.
 *
 * BUSINESS RULE:
 * - Does NOT create Opportunity/Activity/Task
 * - Opportunity only created on real commercial signal
 *
 * VALIDATION:
 * - Session required (getCurrentOwner)
 * - Company must exist
 * - Contact must exist and belong to Company (if provided)
 * - Business Line must be active with PROSPECTING or COLD_CALL mode
 *
 * @param input Company, Contact, Business Line, Owner
 * @returns Success/failure with action taken (CREATED/REUSED/ENRICHED)
 */
export async function addToProspecting(
  input: AddToProspectingInput
): Promise<AddToProspectingResult> {
  try {
    // 1. Get current owner (validates session)
    const currentUser = await getCurrentOwner()
    const owner = input.owner || currentUser

    // 2. Validate Company exists
    let company
    try {
      company = await getCompanyById(input.companyId)
    } catch (error) {
      return {
        success: false,
        message: 'Entreprise introuvable',
      }
    }

    // 3. Validate Contact if provided
    if (input.contactId) {
      let contact
      try {
        contact = await getContactById(input.contactId)
      } catch (error) {
        return {
          success: false,
          message: 'Contact introuvable',
        }
      }

      // Verify contact belongs to company
      if (contact.companyId !== input.companyId) {
        return {
          success: false,
          message: 'Le contact ne correspond pas à cette entreprise',
        }
      }
    }

    // 4. Validate Business Line
    let businessLine
    try {
      businessLine = await getBusinessLineById(input.businessLineId)
    } catch (error) {
      return {
        success: false,
        message: 'Business Line introuvable',
      }
    }

    // Validate BL is active
    if (!businessLine.active) {
      return {
        success: false,
        message: 'Cette Business Line n\'est pas active',
      }
    }

    // Validate BL supports prospecting
    if (
      businessLine.prospectingMode !== 'PROSPECTING' &&
      businessLine.prospectingMode !== 'COLD_CALL'
    ) {
      return {
        success: false,
        message: 'Cette Business Line n\'utilise pas la prospection',
      }
    }

    // 5. Call central anti-duplicate logic
    const result = await findOrCreateProspectingTarget({
      companyId: input.companyId,
      businessLineId: input.businessLineId,
      contactId: input.contactId || null,
      owner,
      status: 'À appeler', // New targets always start with "À appeler"
    })

    // 6. Map action to user-friendly message
    let action: AddToProspectingAction
    let message: string

    switch (result.action) {
      case 'CREATE_NEW':
        action = 'CREATED'
        message = 'Ajouté à la prospection'
        break

      case 'REUSE_EXISTING':
        action = 'REUSED'
        message = 'Cette cible est déjà présente dans la prospection'
        break

      case 'ENRICH_CONTACTLESS_TARGET':
        action = 'ENRICHED'
        message = 'La cible existante a été enrichie avec ce contact'
        break

      case 'RESTORED':
        action = 'RESTORED'
        message = 'Cible archivée restaurée'
        break

      default:
        return {
          success: false,
          message: 'Action inconnue',
        }
    }

    // 7. Revalidate relevant paths
    revalidatePath('/cold-call')
    revalidatePath(`/companies/${input.companyId}`)
    if (input.contactId) {
      revalidatePath(`/contacts/${input.contactId}`)
    }

    return {
      success: true,
      action,
      targetId: result.target.id,
      message,
    }
  } catch (error: any) {
    console.error('Error in addToProspecting:', error)
    return {
      success: false,
      message: error.message || 'Une erreur est survenue',
    }
  }
}

/**
 * Check if ProspectingTarget exists (pre-check UX)
 *
 * READ-ONLY: No mutations, only checks existence and returns state.
 *
 * Used by modal to inform user BEFORE clicking "Ajouter":
 * - NEW: No target exists, will create
 * - EXISTING: Exact target exists, will reuse
 * - WILL_ENRICH: Contactless target exists, will enrich with contact
 * - OTHER_CONTACT_EXISTS: Different contact(s) exist for same Company+BL
 *
 * IMPORTANT:
 * - This is NOT a guarantee of final action
 * - Server Action addToProspecting() always re-validates and applies anti-duplicate logic
 * - Pre-check can become stale between check and submit
 *
 * @param input Company, Business Line, Contact
 * @returns State and optional existing target info
 */
export async function checkProspectingTarget(
  input: ProspectingCheckInput
): Promise<ProspectingCheckResult> {
  try {
    // Session validation (same as addToProspecting)
    await getCurrentOwner()

    // Validate inputs exist (lightweight validation)
    try {
      await getCompanyById(input.companyId)
    } catch {
      // Company not found - treat as NEW (will fail on submit anyway)
      return { state: 'NEW' }
    }

    try {
      await getBusinessLineById(input.businessLineId)
    } catch {
      // BL not found - treat as NEW (will fail on submit anyway)
      return { state: 'NEW' }
    }

    if (input.contactId) {
      try {
        await getContactById(input.contactId)
      } catch {
        // Contact not found - treat as NEW (will fail on submit anyway)
        return { state: 'NEW' }
      }
    }

    // Use central anti-duplicate logic (read-only, no mutations)
    const result = await findOrPrepareProspectingTarget({
      companyId: input.companyId,
      businessLineId: input.businessLineId,
      contactId: input.contactId || null,
      owner: 'Lilian', // Dummy owner (not used for read-only check)
      status: 'À appeler', // Dummy status (not used for read-only check)
    })

    // Map internal action to UX state
    switch (result.action) {
      case 'CREATE_NEW': {
        // Check if other contacts exist for same Company+BL
        // (to show "OTHER_CONTACT_EXISTS" message)
        if (input.contactId && result.message.includes('contact différent')) {
          return {
            state: 'OTHER_CONTACT_EXISTS',
            otherContactsCount: 1, // We know at least one exists
          }
        }

        return { state: 'NEW' }
      }

      case 'REUSE_EXISTING': {
        return {
          state: 'EXISTING',
          targetId: result.target?.id,
          status: result.target?.callStatus,
        }
      }

      case 'ENRICH_CONTACTLESS_TARGET': {
        return {
          state: 'WILL_ENRICH',
          targetId: result.target?.id,
        }
      }

      case 'RESTORED': {
        return {
          state: 'WILL_RESTORE',
          targetId: result.target?.id,
        }
      }

      default:
        return { state: 'NEW' }
    }
  } catch (error: any) {
    console.error('Error in checkProspectingTarget:', error)
    // On error, default to NEW (submit will handle real validation)
    return { state: 'NEW' }
  }
}

/**
 * Remove Company/Contact from Prospecting (Archive)
 *
 * Archives a ProspectingTarget without deleting it.
 *
 * BUSINESS RULES:
 * - Never physically delete target
 * - Always archive (set Archived=true)
 * - Preserve all Activities, Tasks, Opportunity, History
 * - Do NOT cancel Tasks (user manages manually)
 * - Do NOT modify Call Status
 * - Do NOT create artificial Activity/Value Event
 *
 * VALIDATION:
 * - Session required (getCurrentOwner)
 * - Target must exist
 * - Target must not already be archived (idempotent)
 *
 * @param targetId Prospecting Target ID
 * @returns Success/failure with message
 */
export async function removeFromProspecting(
  targetId: string
): Promise<RemoveFromProspectingResult> {
  try {
    // 1. Get current owner (validates session)
    const currentOwner = await getCurrentOwner()

    // 2. Validate Target exists
    let target
    try {
      const { getColdCallTargetById } = await import('@/lib/airtable')
      target = await getColdCallTargetById(targetId)
    } catch (error) {
      return {
        success: false,
        message: 'Cible introuvable',
      }
    }

    // 3. Check if already archived (idempotent)
    if (target.archived) {
      return {
        success: true, // Success but already archived
        message: 'Cette cible est déjà archivée',
      }
    }

    // 4. Archive target
    const { updateColdCallTarget } = await import('@/lib/airtable')
    await updateColdCallTarget(targetId, {
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: currentOwner,
    })

    // 5. Revalidate paths
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/cold-call')
    revalidatePath('/today')
    revalidatePath('/work')

    return {
      success: true,
      message: 'Retiré de la prospection',
    }
  } catch (error: any) {
    console.error('Error in removeFromProspecting:', error)
    return {
      success: false,
      message: error.message || 'Une erreur est survenue',
    }
  }
}
