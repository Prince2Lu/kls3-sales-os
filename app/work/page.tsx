// Work Mode - Commercial workflow by Business Line + Status/Stage + Owner

import {
  getColdCallTargets,
  getOpportunities,
  getBusinessLines,
  getCompanies,
  getContacts,
  getActivities,
  getTasks,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { WorkMode } from './work-mode'

export default async function WorkPage() {
  const currentOwner = await getCurrentOwner()

  // Load all data - NO LIMITS to avoid hiding targets/opportunities
  // Airtable pagination handles large datasets automatically via fetchRecords()
  const [
    targets,
    opportunities,
    businessLines,
    companies,
    contacts,
    activities,
    tasks,
  ] = await Promise.all([
    getColdCallTargets(), // No limit - all prospecting targets
    getOpportunities(), // No limit - all opportunities
    getBusinessLines(),
    getCompanies(), // No limit - all companies
    getContacts(), // No limit - all contacts
    getActivities(), // No limit - complete call history
    getTasks({ status: 'TODO' }), // No limit - all TODO tasks
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Mode de travail</h1>
        <p className="text-text-muted mt-2">
          Travailler par blocs cohérents : Business Line + Étape + Commercial
        </p>
      </div>

      <WorkMode
        targets={targets}
        opportunities={opportunities}
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
