// Companies list page (Phase 2 + Search/View/Filter UX)

import { getCompanies, getContacts, getOpportunities, getBusinessLines } from '@/lib/airtable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CompaniesClient } from './companies-client'

export default async function CompaniesPage() {
  const [companies, contacts, opportunities, businessLines] = await Promise.all([
    getCompanies({ maxRecords: 500 }),
    getContacts({ maxRecords: 500 }),
    getOpportunities({ maxRecords: 500 }),
    getBusinessLines(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Entreprises</h1>
        </div>
        <Link href="/companies/new">
          <Button>+ Nouvelle entreprise</Button>
        </Link>
      </div>

      <CompaniesClient
        companies={companies}
        contacts={contacts}
        opportunities={opportunities}
        businessLines={businessLines}
      />
    </div>
  )
}
