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
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { parseBusinessLineParam, buildUrlWithBusinessLine } from '@/lib/utils/business-line-filter'
import { buildFocusQueue } from './queue-builder'
import { FocusSession } from './focus-session'

export default async function FocusPage(props: {
  searchParams: Promise<{ businessLine?: string }>
}) {
  const currentOwner = await getCurrentOwner()

  // Await searchParams (Next.js 16 async model)
  const searchParams = await props.searchParams

  // Parse Business Line filter from URL
  const selectedBusinessLineCode = parseBusinessLineParam(searchParams.businessLine)

  // Fetch all data needed to build the queue - NO LIMITS
  const [allTasks, opportunities, contacts, companies, businessLines, activities] =
    await Promise.all([
      getTasks({ owner: currentOwner }), // No limit - all tasks for current owner
      getOpportunities(), // No limit - all opportunities
      getContacts(), // No limit - all contacts
      getCompanies(), // No limit - all companies
      getBusinessLines(),
      getActivities(), // No limit - all activities for context
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
