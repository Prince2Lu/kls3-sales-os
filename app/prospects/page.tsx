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

export default async function ProspectsPage() {
  const [opportunities, businessLines, companies, contacts, tasks] = await Promise.all([
    getOpportunities({ maxRecords: 500 }),
    getBusinessLines(),
    getCompanies({ maxRecords: 500 }),
    getContacts({ maxRecords: 500 }),
    getTasks({ maxRecords: 500 }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Prospects</h1>
        </div>
        <Link href="/prospects/new">
          <Button>+ Nouveau prospect</Button>
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
