// Focus Mode page (Phase 5 + Phase 6C-B)
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
import { parseBusinessLineParam, buildUrlWithBusinessLine } from '@/lib/utils/business-line-filter'
import { buildFocusQueue } from './queue-builder'
import { FocusSession } from './focus-session'

export default async function FocusPage(props: {
  searchParams: Promise<{ businessLine?: string }>
}) {
  const currentUser = getCurrentUser()

  // Await searchParams (Next.js 16 async model)
  const searchParams = await props.searchParams

  // Parse Business Line filter from URL
  const selectedBusinessLineCode = parseBusinessLineParam(searchParams.businessLine)

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

  // Build the Focus queue with Business Line filter
  const queue = buildFocusQueue({
    tasks: allTasks,
    opportunities,
    contacts,
    companies,
    businessLines,
    activities,
    businessLineCode: selectedBusinessLineCode,
  })

  // If no eligible tasks, redirect to /today with Business Line context preserved
  if (queue.length === 0) {
    const returnUrl = buildUrlWithBusinessLine('/today', selectedBusinessLineCode)
    redirect(returnUrl)
  }

  return <FocusSession initialQueue={queue} businessLineCode={selectedBusinessLineCode} />
}
