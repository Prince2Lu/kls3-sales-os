'use server'

// Server actions for VALUE_EVENT registration
// Phase 9: Economic Events & Revenue Integrity

import { revalidatePath } from 'next/cache'
import {
  getOpportunityById,
  getBusinessLineById,
  createValueEvent,
  getValueEvents,
  updateValueEvent,
} from '@/lib/airtable'
import type { EventType, RevenueType, ValueEventStatus } from '@/types/domain'

// ============================================================================
// DUPLICATE PROTECTION
// ============================================================================

/**
 * Check for existing active VALUE_EVENTS that would constitute a duplicate
 * Business-aware rules:
 * - PAUL: Multiple PAID_MEETING allowed
 * - LEVERIO/CALYMIA/KLS3_NOTAIRES: One active event per opportunity
 */
async function checkDuplicate(
  opportunityId: string,
  eventType: EventType
): Promise<{ isDuplicate: boolean; existingEvent?: any }> {
  // Fetch all VALUE_EVENTS for this opportunity
  const allValueEvents = await getValueEvents({ maxRecords: 1000 })
  const opportunityEvents = allValueEvents.filter(
    (ve) => ve.opportunityId === opportunityId && ve.eventType === eventType
  )

  // Active statuses (not cancelled)
  const activeEvents = opportunityEvents.filter(
    (ve) => ve.status === 'PENDING' || ve.status === 'CONFIRMED' || ve.status === 'PAID'
  )

  // PAUL: Multiple PAID_MEETING allowed
  if (eventType === 'PAID_MEETING') {
    return { isDuplicate: false }
  }

  // LEVERIO/CALYMIA/KLS3_NOTAIRES: Only one active event allowed
  if (activeEvents.length > 0) {
    return { isDuplicate: true, existingEvent: activeEvents[0] }
  }

  return { isDuplicate: false }
}

// ============================================================================
// REGISTER VALUE EVENT
// ============================================================================

export interface RegisterValueEventInput {
  opportunityId: string
  eventDate: string // ISO date
  amount: number
  status: ValueEventStatus
  notes?: string
}

export interface RegisterValueEventResult {
  success: boolean
  error?: string
  valueEventId?: string
}

export interface UpdateValueEventInput {
  valueEventId: string
  eventDate: string // ISO date
  amount: number
  status: ValueEventStatus
  notes?: string
}

export interface UpdateValueEventResult {
  success: boolean
  error?: string
}

export async function updateValueEventAction(
  input: UpdateValueEventInput
): Promise<UpdateValueEventResult> {
  try {
    // 1. Load existing VALUE_EVENT
    const allValueEvents = await getValueEvents({ maxRecords: 1000 })
    const existingEvent = allValueEvents.find((ve) => ve.id === input.valueEventId)

    if (!existingEvent) {
      return {
        success: false,
        error: 'Événement économique introuvable',
      }
    }

    // 2. Validate amount
    if (input.amount <= 0) {
      return {
        success: false,
        error: 'Le montant doit être supérieur à 0',
      }
    }

    // 3. Validate eventDate
    if (!input.eventDate) {
      return {
        success: false,
        error: 'La date de l\'événement est requise',
      }
    }

    // 4. Validate status
    const validStatuses: ValueEventStatus[] = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED']
    if (!validStatuses.includes(input.status)) {
      return {
        success: false,
        error: 'Statut invalide',
      }
    }

    // 5. Update VALUE_EVENT (preserving businessLineId, eventType, revenueType, opportunityId)
    await updateValueEvent(input.valueEventId, {
      eventDate: input.eventDate,
      amount: input.amount,
      status: input.status,
      notes: input.notes,
    })

    // 6. Revalidate relevant routes
    if (existingEvent.opportunityId) {
      revalidatePath(`/prospects/${existingEvent.opportunityId}`)
    }
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error updating value event:', error.message)
    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour',
    }
  }
}

export async function registerValueEvent(
  input: RegisterValueEventInput
): Promise<RegisterValueEventResult> {
  try {
    // 1. Load opportunity server-side
    const opportunity = await getOpportunityById(input.opportunityId)
    if (!opportunity) {
      return {
        success: false,
        error: 'Opportunité introuvable',
      }
    }

    // 2. Load Business Line
    const businessLine = await getBusinessLineById(opportunity.businessLineId)
    if (!businessLine) {
      return {
        success: false,
        error: 'Business Line introuvable',
      }
    }

    // 3. Derive eventType and revenueType from BL (server-side, not client-trusted)
    const eventType = businessLine.revenueTrigger
    const revenueType = businessLine.revenueType

    // 4. Validate amount
    if (input.amount <= 0) {
      return {
        success: false,
        error: 'Le montant doit être supérieur à 0',
      }
    }

    // 5. Validate eventDate
    if (!input.eventDate) {
      return {
        success: false,
        error: 'La date de l\'événement est requise',
      }
    }

    // 6. Validate status
    const validStatuses: ValueEventStatus[] = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED']
    if (!validStatuses.includes(input.status)) {
      return {
        success: false,
        error: 'Statut invalide',
      }
    }

    // 7. Check for duplicates (business-aware)
    const duplicateCheck = await checkDuplicate(opportunity.id, eventType)
    if (duplicateCheck.isDuplicate) {
      // Business Line specific error messages
      let errorMessage = 'Un événement économique actif existe déjà pour cette opportunité'

      if (eventType === 'SIGNED_DEAL') {
        errorMessage = 'Un deal signé existe déjà pour cette opportunité'
      } else if (eventType === 'SUBSCRIPTION_STARTED') {
        errorMessage = 'Un abonnement actif existe déjà pour cette opportunité'
      } else if (eventType === 'SIGNED_PROJECT') {
        errorMessage = 'Un projet signé existe déjà pour cette opportunité'
      }

      return {
        success: false,
        error: errorMessage,
      }
    }

    // 8. Create VALUE_EVENT using existing function
    const valueEvent = await createValueEvent({
      opportunityId: opportunity.id,
      businessLineId: businessLine.id,
      eventType,
      eventDate: input.eventDate,
      amount: input.amount,
      revenueType,
      status: input.status,
      notes: input.notes,
    })

    // 9. Revalidate relevant routes
    revalidatePath(`/prospects/${opportunity.id}`)
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

    return {
      success: true,
      valueEventId: valueEvent.id,
    }
  } catch (error: any) {
    console.error('Error registering value event:', error.message)
    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'enregistrement de la valeur',
    }
  }
}
