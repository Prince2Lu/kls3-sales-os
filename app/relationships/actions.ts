// Server actions for Relationship operations (Phase 2)

'use server'

import {
  createRelationship,
  updateRelationship,
  getRelationshipById,
  getRelationships,
  getActivities,
  getTasks,
  getOpportunities,
  getContactById,
  getCompanyById,
} from '@/lib/airtable'
import { enrichRelationshipsWithInteractions } from '@/lib/relationships/helpers'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { revalidatePath } from 'next/cache'
import type {
  RelationshipType,
  RelationshipStatus,
  RelationshipImportance,
  Owner,
} from '@/types/domain'

// ============================================================================
// RELATIONSHIP ACTIONS
// ============================================================================

export interface CreateRelationshipInput {
  name: string
  companyId?: string
  contactId?: string
  owner?: Owner // Optional - defaults to current user
  relationshipType: RelationshipType
  status: RelationshipStatus
  objective?: string
  importance: RelationshipImportance
  notes?: string
}

export async function createRelationshipAction(input: CreateRelationshipInput) {
  try {
    // Default owner to current user if not provided
    const owner = input.owner || (await getCurrentOwner())

    const relationship = await createRelationship({
      name: input.name,
      companyId: input.companyId,
      contactId: input.contactId,
      owner,
      relationshipType: input.relationshipType,
      status: input.status,
      objective: input.objective,
      importance: input.importance,
      notes: input.notes,
    })

    revalidatePath('/relationships')
    if (input.contactId) {
      revalidatePath(`/contacts/${input.contactId}`)
    }
    if (input.companyId) {
      revalidatePath(`/companies/${input.companyId}`)
    }

    return { success: true, id: relationship.id }
  } catch (error) {
    console.error('Failed to create relationship:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateRelationshipAction(
  id: string,
  input: Partial<CreateRelationshipInput>
) {
  try {
    const relationship = await updateRelationship(id, {
      name: input.name,
      companyId: input.companyId,
      contactId: input.contactId,
      owner: input.owner,
      relationshipType: input.relationshipType,
      status: input.status,
      objective: input.objective,
      importance: input.importance,
      notes: input.notes,
    })

    revalidatePath('/relationships')
    revalidatePath(`/relationships/${id}`)
    if (input.contactId) {
      revalidatePath(`/contacts/${input.contactId}`)
    }
    if (input.companyId) {
      revalidatePath(`/companies/${input.companyId}`)
    }

    return { success: true, relationship }
  } catch (error) {
    console.error('Failed to update relationship:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// DATA LOADING HELPER
// ============================================================================

/**
 * Load relationship with enriched data for detail page
 * - Relationship record
 * - Linked contact and company
 * - Activities, tasks, opportunities
 * - Last interaction and next action computed
 */
export async function loadRelationshipDetail(id: string) {
  try {
    // Load relationship
    const relationship = await getRelationshipById(id)

    // Load linked entities
    const [contact, company] = await Promise.all([
      relationship.contactId
        ? getContactById(relationship.contactId).catch(() => null)
        : Promise.resolve(null),
      relationship.companyId
        ? getCompanyById(relationship.companyId).catch(() => null)
        : Promise.resolve(null),
    ])

    // Load related activities, tasks, opportunities
    const [allActivities, allTasks, opportunities] = await Promise.all([
      getActivities({ maxRecords: 10000 }),
      getTasks({ maxRecords: 10000 }),
      getOpportunities({ maxRecords: 1000 }),
    ])

    // Filter by relationshipId manually
    const activities = allActivities.filter(a => a.relationshipId === id)
    const tasks = allTasks.filter(t => t.relationshipId === id)

    // Filter opportunities introduced by this relationship
    const introducedOpportunities = opportunities.filter(
      (opp) => opp.introducedByRelationshipId === id
    )

    // Enrich with last interaction and next action
    const enriched = enrichRelationshipsWithInteractions(
      [relationship],
      activities,
      tasks
    )[0]

    return {
      success: true,
      data: {
        relationship: enriched,
        contact,
        company,
        activities,
        tasks,
        introducedOpportunities,
      },
    }
  } catch (error) {
    console.error('Failed to load relationship detail:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Relationship not found',
    }
  }
}

/**
 * Load relationships for a contact with enriched interaction data
 */
export async function loadContactRelationships(contactId: string) {
  try {
    const [relationships, activities, tasks] = await Promise.all([
      getRelationships({ contactId }),
      getActivities({ contactId }),
      getTasks({ contactId }),
    ])

    const enriched = enrichRelationshipsWithInteractions(
      relationships,
      activities,
      tasks
    )

    return { success: true, data: enriched }
  } catch (error) {
    console.error('Failed to load contact relationships:', error)
    return { success: false, data: [] }
  }
}

/**
 * Load relationships for a company with enriched interaction data
 */
export async function loadCompanyRelationships(companyId: string) {
  try {
    const [relationships, activities, tasks] = await Promise.all([
      getRelationships({ companyId }),
      getActivities({ maxRecords: 1000 }), // Load all activities
      getTasks({ maxRecords: 1000 }), // Load all tasks
    ])

    const enriched = enrichRelationshipsWithInteractions(
      relationships,
      activities,
      tasks
    )

    return { success: true, data: enriched }
  } catch (error) {
    console.error('Failed to load company relationships:', error)
    return { success: false, data: [] }
  }
}
