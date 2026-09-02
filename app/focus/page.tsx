// Focus Mode page (Phase 5)
// Execution mode for processing commercial tasks one by one

import { redirect } from 'next/navigation'
import {
  getTasks,
  getOpportunities,
  getContacts,
  getCompanies,
  getBusinessLines,
  getActivities,
} from '@/lib/airtable'
import { getCurrentUser } from '@/lib/utils/current-user'
import { buildFocusQueue } from './queue-builder'
import { FocusSession } from './focus-session'

export default async function FocusPage() {
  const currentUser = getCurrentUser()

  // Fetch all data needed to build the queue
  const [allTasks, opportunities, contacts, companies, businessLines, activities] =
    await Promise.all([
      getTasks({ owner: currentUser, maxRecords: 500 }),
      getOpportunities({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getCompanies({ maxRecords: 500 }),
      getBusinessLines(),
      getActivities({ maxRecords: 1000 }), // Recent activities for context
    ])

  // Build the Focus queue
  const queue = buildFocusQueue({
    tasks: allTasks,
    opportunities,
    contacts,
    companies,
    businessLines,
    activities,
  })

  // If no eligible tasks, redirect to /today
  if (queue.length === 0) {
    redirect('/today')
  }

  return <FocusSession initialQueue={queue} />
}
