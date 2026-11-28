// Prospects/Opportunities list page (Phase 2 + Search/View UX)

import {
  getOpportunities,
  getBusinessLines,
  getCompanies,
  getContacts,
  getTasks,
} from '@/lib/airtable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ProspectsClient } from './prospects-client'
import { currentBusinessLineScope } from '@/lib/auth/business-line-scope-server'
import { scopeCrmData } from '@/lib/auth/business-line-scope'

export default async function ProspectsPage() {
  // Business Line scope of the signed-in user (Trello #4 part 2)
  const scope = await currentBusinessLineScope()
  let [opportunities, businessLines, companies, contacts, tasks] = await Promise.all([
    getOpportunities(),
    getBusinessLines(),
    getCompanies(),
    getContacts(),
    getTasks(),
  ])
  ;({ opportunities: opportunities, businessLines: businessLines, tasks: tasks } = scopeCrmData(scope, { opportunities: opportunities, businessLines: businessLines, tasks: tasks }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Opportunités</h1>
        </div>
        <Link href="/prospects/new">
          <Button>+ Nouvelle opportunité</Button>
        </Link>
      </div>

      <ProspectsClient
        opportunities={opportunities}
        businessLines={businessLines}
        companies={companies}
        contacts={contacts}
        tasks={tasks}
      />
    </div>
  )
}
