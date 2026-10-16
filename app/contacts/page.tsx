// Contacts list page (Phase 2 + Search/View/Filter UX)

import { getContacts, getCompanies, getOpportunities, getBusinessLines } from '@/lib/airtable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ContactsClient } from './contacts-client'

export default async function ContactsPage() {
  const [contacts, companies, opportunities, businessLines] = await Promise.all([
    getContacts({ maxRecords: 500 }),
    getCompanies({ maxRecords: 500 }),
    getOpportunities({ maxRecords: 500 }),
    getBusinessLines(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-syne">Contacts</h1>
        </div>
        <Link href="/contacts/new">
          <Button>+ Nouveau contact</Button>
        </Link>
      </div>

      <ContactsClient
        contacts={contacts}
        companies={companies}
        opportunities={opportunities}
        businessLines={businessLines}
      />
    </div>
  )
}
