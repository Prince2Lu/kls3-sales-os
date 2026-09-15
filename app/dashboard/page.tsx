// Dashboard page (Phase 6A)
// Commercial piloting cockpit for KLS3 Sales OS

import {
  getBusinessLines,
  getValueEvents,
  getOpportunities,
  getActivities,
  getTasks,
  getCompanies,
  getContacts,
} from '@/lib/airtable'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  // Fetch all required data in parallel (TEAM VIEW - no owner filtering)
  // NO LIMITS - Airtable pagination handles large datasets automatically
  const [businessLines, valueEvents, opportunities, activities, tasks, companies, contacts] =
    await Promise.all([
      getBusinessLines(),
      getValueEvents(), // No limit - all value events
      getOpportunities(), // No limit - all opportunities
      getActivities(), // No limit - complete activity history
      getTasks(), // No limit - all tasks
      getCompanies(), // No limit - all companies
      getContacts(), // No limit - all contacts
    ])

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardClient
        businessLines={businessLines}
        valueEvents={valueEvents}
        opportunities={opportunities}
        activities={activities}
        tasks={tasks}
        companies={companies}
        contacts={contacts}
      />
    </div>
  )
}
