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
  // Fetch all required data in parallel
  const [businessLines, valueEvents, opportunities, activities, tasks, companies, contacts] =
    await Promise.all([
      getBusinessLines(),
      getValueEvents({ maxRecords: 1000 }),
      getOpportunities({ maxRecords: 500 }),
      getActivities({ maxRecords: 2000 }),
      getTasks({ maxRecords: 500 }),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
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
