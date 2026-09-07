// Server actions for Prospect operations (Phase 2.5)

'use server'

import {
  createOpportunity,
  updateOpportunity,
  createActivity,
  updateActivity,
  createTask,
  updateTask,
  createCompany,
  createContact,
  getCompanies,
  getContacts,
} from '@/lib/airtable'
import { revalidatePath } from 'next/cache'
import type { Owner, Stage, Priority, Source } from '@/types/domain'

// ============================================================================
// OPPORTUNITY ACTIONS
// ============================================================================

export interface CreateOpportunityInput {
  name: string
  businessLineId: string
  owner: Owner
  stage: Stage
  priority?: Priority
  source?: Source
  potentialValue?: number
  probability?: number
  expectedCloseDate?: string
  problem?: string
  need?: string
  nextStepNotes?: string
  // Company handling
  companyId?: string
  newCompanyName?: string
  // Contact handling
  contactId?: string
  newContactFirstName?: string
  newContactLastName?: string
  newContactEmail?: string
  newContactPhone?: string
  newContactJobTitle?: string
}

export async function createOpportunityAction(input: CreateOpportunityInput) {
  try {
    let companyId = input.companyId
    let contactId = input.contactId

    // Create company if needed
    if (!companyId && input.newCompanyName) {
      const company = await createCompany({ name: input.newCompanyName })
      companyId = company.id
    }

    // Create contact if needed
    if (!contactId && input.newContactFirstName && input.newContactLastName) {
      const contact = await createContact({
        firstName: input.newContactFirstName,
        lastName: input.newContactLastName,
        email: input.newContactEmail,
        phone: input.newContactPhone,
        jobTitle: input.newContactJobTitle,
        companyId,
      })
      contactId = contact.id
    }

    // Create opportunity
    const opportunity = await createOpportunity({
      name: input.name,
      companyId,
      primaryContactId: contactId,
      businessLineId: input.businessLineId,
      owner: input.owner,
      stage: input.stage,
      priority: input.priority,
      source: input.source,
      potentialValue: input.potentialValue,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate,
      problem: input.problem,
      need: input.need,
      nextStepNotes: input.nextStepNotes,
    })

    revalidatePath('/prospects')
    revalidatePath('/pipeline')

    return { success: true, id: opportunity.id }
  } catch (error) {
    console.error('Failed to create opportunity:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateOpportunityAction(
  id: string,
  input: Partial<CreateOpportunityInput>
) {
  try {
    await updateOpportunity(id, {
      name: input.name,
      businessLineId: input.businessLineId,
      owner: input.owner as Owner | undefined,
      stage: input.stage as Stage | undefined,
      priority: input.priority,
      source: input.source,
      potentialValue: input.potentialValue,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate,
      problem: input.problem,
      need: input.need,
      nextStepNotes: input.nextStepNotes,
      companyId: input.companyId,
      primaryContactId: input.contactId,
    })

    revalidatePath('/prospects')
    revalidatePath(`/prospects/${id}`)
    revalidatePath('/pipeline')

    return { success: true }
  } catch (error) {
    console.error('Failed to update opportunity:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// ACTIVITY ACTIONS
// ============================================================================

export interface CreateActivityInput {
  opportunityId: string
  contactId?: string
  type: string
  date: string
  result?: string
  notes?: string
  owner: Owner
  durationMinutes?: number
}

export async function createActivityAction(input: CreateActivityInput) {
  try {
    await createActivity(input)

    revalidatePath(`/prospects/${input.opportunityId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to create activity:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateActivityAction(
  id: string,
  opportunityId: string,
  input: Partial<CreateActivityInput>
) {
  try {
    await updateActivity(id, input)

    revalidatePath(`/prospects/${opportunityId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to update activity:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// TASK ACTIONS
// ============================================================================

export interface CreateTaskInput {
  opportunityId: string
  contactId?: string
  type: string
  dueAt?: string
  priority?: Priority
  notes?: string
  owner: Owner
}

export async function createTaskAction(input: CreateTaskInput) {
  try {
    await createTask({
      ...input,
      status: 'TODO',
    })

    revalidatePath(`/prospects/${input.opportunityId}`)
    revalidatePath('/pipeline')

    return { success: true }
  } catch (error) {
    console.error('Failed to create task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateTaskAction(
  taskId: string,
  opportunityId: string,
  input: Partial<CreateTaskInput>
) {
  try {
    await updateTask(taskId, input)

    revalidatePath(`/prospects/${opportunityId}`)
    revalidatePath('/prospects')
    revalidatePath('/pipeline')

    return { success: true }
  } catch (error) {
    console.error('Failed to update task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function completeTaskAction(taskId: string) {
  try {
    await updateTask(taskId, {
      status: 'DONE',
      completedAt: new Date().toISOString(),
    })

    revalidatePath('/prospects')
    revalidatePath('/pipeline')

    return { success: true }
  } catch (error) {
    console.error('Failed to complete task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function cancelTaskAction(taskId: string) {
  try {
    await updateTask(taskId, {
      status: 'CANCELLED',
    })

    revalidatePath('/prospects')
    revalidatePath('/pipeline')

    return { success: true }
  } catch (error) {
    console.error('Failed to cancel task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// LOOKUP ACTIONS
// ============================================================================

export async function searchCompanies(query: string) {
  try {
    const companies = await getCompanies({ maxRecords: 50 })
    return companies
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
  } catch (error) {
    console.error('Failed to search companies:', error)
    return []
  }
}

export async function searchContacts(query: string, companyId?: string) {
  try {
    const contacts = await getContacts({
      companyId,
      maxRecords: 50,
    })
    const fullName = (c: { firstName: string; lastName: string }) =>
      `${c.firstName} ${c.lastName}`.toLowerCase()

    return contacts
      .filter((c) => fullName(c).includes(query.toLowerCase()))
      .slice(0, 10)
  } catch (error) {
    console.error('Failed to search contacts:', error)
    return []
  }
}
