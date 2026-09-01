// Server actions for Contact operations (Phase 2.5 bugfix)

'use server'

import { createContact, updateContact } from '@/lib/airtable'
import { revalidatePath } from 'next/cache'

// ============================================================================
// CONTACT ACTIONS
// ============================================================================

export interface CreateContactInput {
  firstName: string
  lastName: string
  companyId?: string
  jobTitle?: string
  email?: string
  phone?: string
  linkedin?: string
  notes?: string
}

export async function createContactAction(input: CreateContactInput) {
  try {
    const contact = await createContact({
      firstName: input.firstName,
      lastName: input.lastName,
      companyId: input.companyId,
      jobTitle: input.jobTitle,
      email: input.email,
      phone: input.phone,
      linkedin: input.linkedin,
      notes: input.notes,
    })

    revalidatePath('/contacts')
    if (input.companyId) {
      revalidatePath(`/companies/${input.companyId}`)
    }

    return { success: true, id: contact.id }
  } catch (error) {
    console.error('Failed to create contact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateContactAction(
  id: string,
  input: Partial<CreateContactInput>
) {
  try {
    await updateContact(id, {
      firstName: input.firstName,
      lastName: input.lastName,
      companyId: input.companyId,
      jobTitle: input.jobTitle,
      email: input.email,
      phone: input.phone,
      linkedin: input.linkedin,
      notes: input.notes,
    })

    revalidatePath('/contacts')
    revalidatePath(`/contacts/${id}`)
    if (input.companyId) {
      revalidatePath(`/companies/${input.companyId}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to update contact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
