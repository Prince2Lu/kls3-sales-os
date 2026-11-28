// Companies list page (Phase 2 + Search/View/Filter UX)

import { getCompanies, getContacts, getOpportunities, getBusinessLines } from '@/lib/airtable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CompaniesClient } from './companies-client'
import { currentBusinessLineScope } from '@/lib/auth/business-line-scope-server'
import { scopeCrmData } from '@/lib/auth/business-line-scope'

export default async function CompaniesPage() {
  // Business Line scope of the signed-in user (Trello #4 part 2)
  const scope = await currentBusinessLineScope()
  let [companies, contacts, opportunities, businessLines] = await Promise.all([
    getCompanies(),
    getContacts(),
    getOpportunities(),
    getBusinessLines(),
  ])
  ;({ opportunities: opportunities, businessLines: businessLines } = scopeCrmData(scope, { opportunities: opportunities, businessLines: businessLines }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-syne">Entreprises</h1>
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
