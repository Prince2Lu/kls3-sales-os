// Prospecting Pipeline page
// Multi-channel: cold call, email, LinkedIn, referrals, etc.

import {
  getColdCallTargets,
  getBusinessLines,
  getCompanies,
  getContacts,
  getActivities,
  getTasks,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { ColdCallBoard } from './cold-call-board'

export default async function ColdCallPage() {
  const currentOwner = await getCurrentOwner()

  // Load all data (pagination handled automatically by fetchRecords)
  // No maxRecords limits to ensure complete call counts and task counts
  const [targets, businessLines, companies, contacts, activities, tasks] =
    await Promise.all([
      getColdCallTargets({ maxRecords: 500 }), // Cold call targets are limited scope
      getBusinessLines(),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getActivities(), // No limit - complete call history
      getTasks({ status: 'TODO' }), // No limit - all TODO tasks
    ])

  const activeProspectingStatuses = new Set([
    'À appeler',
    'À rappeler',
    'Email Flow',
    'Échange',
    'Qualifié',
    'Mauvais numéro',
    'Pas intéressé',
  ])
  const activeTargets = targets.filter((target) =>
    activeProspectingStatuses.has(target.callStatus)
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Prospection</h1>
        <p className="text-text-muted mt-2">
          {activeTargets.length} cible{activeTargets.length !== 1 ? 's' : ''} en prospection active
        </p>
      </div>

      <ColdCallBoard
        targets={activeTargets}
        businessLines={businessLines}
        companies={companies}
        contacts={contacts}
        activities={activities}
        tasks={tasks}
        currentOwner={currentOwner}
      />
    </div>
  )
}
