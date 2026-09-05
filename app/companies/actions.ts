'use server'

// Company actions (create/update/delete)

import { createCompany, updateCompany } from '@/lib/airtable'
import { revalidatePath } from 'next/cache'

interface CompanyFormData {
  name: string
  primaryBusinessLineId?: string
  website?: string
  industry?: string
  addressLine1?: string
  addressLine2?: string
  postalCode?: string
  city?: string
  country?: string
  phone?: string
  companySize?: string
  linkedin?: string
  notes?: string
}

export async function createCompanyAction(data: CompanyFormData) {
  try {
    const company = await createCompany({
      name: data.name,
      primaryBusinessLineId: data.primaryBusinessLineId,
      website: data.website,
      industry: data.industry,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      phone: data.phone,
      companySize: data.companySize,
      linkedin: data.linkedin,
      notes: data.notes,
    })

    revalidatePath('/companies')
    return { success: true, id: company.id }
  } catch (error) {
    console.error('Error creating company:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création',
    }
  }
}

export async function updateCompanyAction(id: string, data: CompanyFormData) {
  try {
    await updateCompany(id, {
      name: data.name,
      primaryBusinessLineId: data.primaryBusinessLineId,
      website: data.website,
      industry: data.industry,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      phone: data.phone,
      companySize: data.companySize,
      linkedin: data.linkedin,
      notes: data.notes,
    })

    revalidatePath('/companies')
    revalidatePath(`/companies/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating company:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
    }
  }
}
