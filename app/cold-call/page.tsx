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
import { loadEmailFollowUp } from '@/app/email-campaigns/follow-up/data'
import type { CampaignSignal } from '@/lib/prospecting/call-queue'
import { currentBusinessLineScope } from '@/lib/auth/business-line-scope-server'
import { scopeCrmData } from '@/lib/auth/business-line-scope'

/** Campaign clicks raise call priority. If they cannot be loaded, Prospection still works. */
async function loadCampaignSignals(): Promise<CampaignSignal[]> {
  try {
    const { rows } = await loadEmailFollowUp()
    return rows
      .filter((row) => row.priority === 'HIGH' || row.priority === 'URGENT')
      .map(({ businessLineId, companyId, contactId, priority, state, reason, lastSignalAt }) =>
        ({ businessLineId, companyId, contactId, priority, state, reason, lastSignalAt }))
  } catch (error) {
    console.error('Prospection: campaign signals unavailable', error instanceof Error ? error.message : error)
    return []
  }
}

export default async function ColdCallPage(props: {
  searchParams: Promise<{ bl?: string }>
}) {
  const currentOwner = await getCurrentOwner()
  const { bl } = await props.searchParams

  // Load all data (pagination handled automatically by fetchRecords)
  // No maxRecords limits to ensure complete call counts and task counts
  // Business Line scope of the signed-in user (Trello #4 part 2)
  const scope = await currentBusinessLineScope()
  let [targets, businessLines, companies, contacts, activities, tasks, campaignSignals] =
    await Promise.all([
      getColdCallTargets(),
      getBusinessLines(),
      getCompanies(),
      getContacts(),
      getActivities(), // No limit - complete call history
      getTasks({ status: 'TODO' }), // No limit - all TODO tasks
      loadCampaignSignals(),
    ])
  ;({ coldCallTargets: targets, businessLines: businessLines, activities: activities, tasks: tasks } = scopeCrmData(scope, { coldCallTargets: targets, businessLines: businessLines, activities: activities, tasks: tasks }))

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
        campaignSignals={campaignSignals}
        initialBusinessLineCode={typeof bl === 'string' ? bl : null}
      />
    </div>
  )
}
