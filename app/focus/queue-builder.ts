// Focus Mode queue construction logic (Phase 5 + Phase 6C-B)
// Builds the prioritized queue of tasks to process

import type {
  Task,
  Opportunity,
  Contact,
  Company,
  BusinessLine,
  Activity,
  Priority,
} from '@/types/domain'
import type { BusinessLineCode } from '@/lib/utils/business-line-filter'
import {
  filterOpportunitiesByBusinessLine,
  filterTasksByBusinessLine,
} from '@/lib/utils/business-line-filter'
import { isFocusEligible } from '@/lib/utils/focus-eligibility'

export interface FocusQueueItem {
  task: Task
  opportunity: Opportunity | null
  contact: Contact | null
  company: Company | null
  businessLine: BusinessLine | null
  lastActivity: Activity | null
}

interface BuildQueueOptions {
  tasks: Task[]
  opportunities: Opportunity[]
  contacts: Contact[]
  companies: Company[]
  businessLines: BusinessLine[]
  activities: Activity[]
  businessLineCode?: BusinessLineCode | null
}

/**
 * Build the prioritized Focus queue
 *
 * Rules:
 * - Only TODO tasks
 * - Only overdue + today (excluding future meetings)
 * - Sort by: priority (URGENT > HIGH > MEDIUM > LOW) then dueAt (earliest first)
 * - Enrich with opportunity/contact/company/businessLine/lastActivity
 * - Optional Business Line filter applied before eligibility check
 */
export function buildFocusQueue(options: BuildQueueOptions): FocusQueueItem[] {
  const {
    tasks,
    opportunities,
    contacts,
    companies,
    businessLines,
    activities,
    businessLineCode,
  } = options

  // Filter by Business Line BEFORE eligibility check
  const filteredOpportunities = filterOpportunitiesByBusinessLine(
    opportunities,
    businessLines,
    businessLineCode || null
  )

  const filteredTasks = filterTasksByBusinessLine(
    tasks,
    opportunities,
    businessLines,
    businessLineCode || null
  )

  // Create lookup maps (use filtered opportunities for queue building)
  const opportunityMap = new Map(filteredOpportunities.map((o) => [o.id, o]))
  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const companyMap = new Map(companies.map((c) => [c.id, c]))
  const businessLineMap = new Map(businessLines.map((bl) => [bl.id, bl]))

  // Group activities by opportunity for efficient lookup
  const activitiesByOpportunity = new Map<string, Activity[]>()
  activities.forEach((activity) => {
    if (activity.opportunityId) {
      const existing = activitiesByOpportunity.get(activity.opportunityId) || []
      activitiesByOpportunity.set(activity.opportunityId, [...existing, activity])
    }
  })

  // Filter eligible tasks using shared eligibility logic
  // Use single 'now' timestamp for consistency
  const now = new Date()
  const eligibleTasks = filteredTasks.filter((task) => isFocusEligible(task, now))

  // Enrich and build queue items
  const queueItems: FocusQueueItem[] = eligibleTasks.map((task) => {
    const opportunity = task.opportunityId
      ? opportunityMap.get(task.opportunityId) || null
      : null

    const contact = task.contactId
      ? contactMap.get(task.contactId) || null
      : null

    const company = opportunity?.companyId
      ? companyMap.get(opportunity.companyId) || null
      : null

    const businessLine = opportunity?.businessLineId
      ? businessLineMap.get(opportunity.businessLineId) || null
      : null

    // Get last activity for this opportunity
    const oppActivities = task.opportunityId
      ? activitiesByOpportunity.get(task.opportunityId) || []
      : []

    // Sort by date desc and take first
    const lastActivity =
      oppActivities.length > 0
        ? oppActivities.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0]
        : null

    return {
      task,
      opportunity,
      contact,
      company,
      businessLine,
      lastActivity,
    }
  })

  // Sort queue
  return queueItems.sort((a, b) => {
    // Priority order
    const priorityOrder: Record<Priority, number> = {
      URGENT: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    }

    const aPriority = a.task.priority ? priorityOrder[a.task.priority] : 4
    const bPriority = b.task.priority ? priorityOrder[b.task.priority] : 4

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    // Within same priority, sort by dueAt (earliest first)
    if (a.task.dueAt && b.task.dueAt) {
      return new Date(a.task.dueAt).getTime() - new Date(b.task.dueAt).getTime()
    }

    // Tasks without dueAt go last
    if (a.task.dueAt && !b.task.dueAt) return -1
    if (!a.task.dueAt && b.task.dueAt) return 1

    return 0
  })
}
