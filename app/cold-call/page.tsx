// Cold Call Pipeline page

import {
  getColdCallTargets,
  getBusinessLines,
  getCompanies,
  getContacts,
  getOpportunities,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { ColdCallBoard } from './cold-call-board'

export default async function ColdCallPage() {
  const currentOwner = await getCurrentOwner()

  const [targets, businessLines, companies, contacts, opportunities] =
    await Promise.all([
      getColdCallTargets({ maxRecords: 500 }),
      getBusinessLines(),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getOpportunities({ maxRecords: 500 }),
    ])

  // Filter for PAUL and LEVERIO (SACHA code) only
  const coldCallBusinessLines = businessLines.filter(
    (bl) => bl.code === 'PAUL' || bl.code === 'SACHA'
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
        currentOwner={currentOwner}
      />
    </div>
  )
}
