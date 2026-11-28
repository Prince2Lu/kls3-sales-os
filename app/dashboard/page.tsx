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
  getColdCallTargets,
  getGoals,
} from '@/lib/airtable'
import type { Goal } from '@/types/domain'

// Goals are optional configuration: a failure must not break the Dashboard.
async function loadGoals(): Promise<{ goals: Goal[]; goalsError: boolean }> {
  try {
    return { goals: await getGoals(), goalsError: false }
  } catch (error) {
    console.error('Dashboard goals unavailable', error instanceof Error ? error.message : 'unknown error')
    return { goals: [], goalsError: true }
  }
}
import { DashboardClient } from './dashboard-client'
import { currentBusinessLineScope } from '@/lib/auth/business-line-scope-server'
import { scopeCrmData } from '@/lib/auth/business-line-scope'

export default async function DashboardPage() {
  // Fetch all required data in parallel (TEAM VIEW - no owner filtering)
  // NO LIMITS - Airtable pagination handles large datasets automatically
  // Business Line scope of the signed-in user (Trello #4 part 2)
  const scope = await currentBusinessLineScope()
  let [businessLines, valueEvents, opportunities, activities, tasks, companies, contacts, coldCallTargets, goalsResult] =
    await Promise.all([
      getBusinessLines(),
      getValueEvents(), // No limit - all value events
      getOpportunities(), // No limit - all opportunities
      getActivities(), // No limit - complete activity history
      getTasks(), // No limit - all tasks
      getCompanies(), // No limit - all companies
      getContacts(), // No limit - all contacts
      getColdCallTargets(),
      loadGoals(),
    ])
  ;({ businessLines: businessLines, valueEvents: valueEvents, opportunities: opportunities, activities: activities, tasks: tasks, coldCallTargets: coldCallTargets } = scopeCrmData(scope, { businessLines: businessLines, valueEvents: valueEvents, opportunities: opportunities, activities: activities, tasks: tasks, coldCallTargets: coldCallTargets }))

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
        coldCallTargets={coldCallTargets}
        goals={goalsResult.goals}
        goalsError={goalsResult.goalsError}
      />
    </div>
  )
}
