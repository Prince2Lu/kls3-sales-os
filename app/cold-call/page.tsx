// Cold Call Pipeline page

import {
  getColdCallTargets,
  getBusinessLines,
  getCompanies,
  getContacts,
  getOpportunities,
  getActivities,
  getTasks,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { ColdCallBoard } from './cold-call-board'

export default async function ColdCallPage() {
  const currentOwner = await getCurrentOwner()

  // Load all data (pagination handled automatically by fetchRecords)
  // No maxRecords limits to ensure complete call counts and task counts
  const [targets, businessLines, companies, contacts, opportunities, activities, tasks] =
    await Promise.all([
      getColdCallTargets({ maxRecords: 500 }), // Cold call targets are limited scope
      getBusinessLines(),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getOpportunities({ maxRecords: 500 }),
      getActivities(), // No limit - complete call history
      getTasks({ status: 'TODO' }), // No limit - all TODO tasks
    ])

  // Filter for Business Lines with COLD_CALL prospecting mode
  const coldCallBusinessLines = businessLines.filter(
    (bl) => bl.prospectingMode === 'COLD_CALL'
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Cold Call Pipeline</h1>
        <p className="text-text-muted mt-2">
          {targets.length} cible{targets.length !== 1 ? 's' : ''} de prospection
        </p>
      </div>

      <ColdCallBoard
        targets={targets}
        businessLines={coldCallBusinessLines}
        companies={companies}
        contacts={contacts}
        opportunities={opportunities}
        activities={activities}
        tasks={tasks}
        currentOwner={currentOwner}
      />
    </div>
  )
}
