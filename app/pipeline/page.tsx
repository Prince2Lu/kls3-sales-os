// Pipeline/Kanban page (Phase 3)

import {
  getOpportunities,
  getBusinessLines,
  getTasks,
  getStageHistory,
  getCompanies,
  getContacts,
  getActivities,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { PipelineBoard } from './pipeline-board'
import { SectionLabel } from '@/components/ui/section-label'

export default async function PipelinePage() {
  const currentOwner = await getCurrentOwner()

  const [opportunities, businessLines, allTasks, stageHistory, companies, contacts, activities] =
    await Promise.all([
      getOpportunities({ maxRecords: 500 }),
      getBusinessLines(),
      getTasks({ status: 'TODO', maxRecords: 500 }),
      getStageHistory({ maxRecords: 1000 }),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getActivities({ maxRecords: 1000 }),
    ])

  // Group opportunities by stage
  const stages = [
    'À prospecter',
    'Contacté',
    'Échange',
    'Qualifié',
    'RDV',
    'Opportunité',
    'Proposition',
    'Gagné',
    'Perdu',
  ] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Pipeline</h1>
        <p className="text-text-muted mt-2">
          {opportunities.length} opportunité{opportunities.length !== 1 ? 's' : ''}
        </p>
      </div>

      <PipelineBoard
        opportunities={opportunities}
        businessLines={businessLines}
        tasks={allTasks}
        stageHistory={stageHistory}
        companies={companies}
        contacts={contacts}
        activities={activities}
        stages={stages}
        currentOwner={currentOwner}
      />
    </div>
  )
}
