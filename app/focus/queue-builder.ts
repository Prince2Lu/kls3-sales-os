// Focus Mode queue construction logic (Phase 5)
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
import { isOverdue, isToday } from '@/lib/utils/date'

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
}

/**
 * Build the prioritized Focus queue
 *
 * Rules:
 * - Only TODO tasks
 * - Only overdue + today (excluding future meetings)
 * - Sort by: priority (URGENT > HIGH > MEDIUM > LOW) then dueAt (earliest first)
 * - Enrich with opportunity/contact/company/businessLine/lastActivity
 */
export function buildFocusQueue(options: BuildQueueOptions): FocusQueueItem[] {
  const { tasks, opportunities, contacts, companies, businessLines, activities } = options

  // Create lookup maps
  const opportunityMap = new Map(opportunities.map((o) => [o.id, o]))
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

  // Filter eligible tasks
  const eligibleTasks = tasks.filter((task) => {
    if (task.status !== 'TODO') return false
    if (!task.dueAt) return false

    // Overdue tasks are always eligible
    if (isOverdue(task.dueAt)) return true

    // Today's tasks are eligible, except future meetings
    if (isToday(task.dueAt)) {
      // For meetings, only include if near due time (simple rule: exclude if >2 hours away)
      if (task.type === 'MEETING') {
        const dueDate = new Date(task.dueAt)
        const now = new Date()
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        // Include if past due or within 2 hours
        return hoursUntilDue <= 2
      }

      // Non-meeting tasks due today are eligible
      return true
    }

    return false
  })

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
