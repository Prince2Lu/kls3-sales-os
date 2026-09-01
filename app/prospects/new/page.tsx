// Create new prospect/opportunity (Phase 2.5)

import { getBusinessLines, getCompanies, getContacts } from '@/lib/airtable'
import { ProspectForm } from '../prospect-form'

interface NewProspectPageProps {
  searchParams: Promise<{ companyId?: string; contactId?: string }>
}

export default async function NewProspectPage({
  searchParams,
}: NewProspectPageProps) {
  const params = await searchParams
  const [businessLines, companies, contacts] = await Promise.all([
    getBusinessLines(),
    getCompanies({ maxRecords: 200 }),
    getContacts({ maxRecords: 200 }),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-syne">Nouveau prospect</h1>
        <p className="text-text-muted mt-2">
          Créer une nouvelle opportunité commerciale
        </p>
      </div>

      <ProspectForm
        businessLines={businessLines}
        companies={companies}
        contacts={contacts}
        defaultCompanyId={params.companyId}
        defaultContactId={params.contactId}
      />
    </div>
  )
}
