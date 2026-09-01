// Edit prospect/opportunity (Phase 2.5)

import {
  getOpportunityById,
  getBusinessLines,
  getCompanies,
  getContacts,
} from '@/lib/airtable'
import { ProspectForm } from '../../prospect-form'
import { notFound } from 'next/navigation'

interface EditProspectPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProspectPage({
  params,
}: EditProspectPageProps) {
  const { id } = await params

  try {
    const [opportunity, businessLines, companies, contacts] = await Promise.all([
      getOpportunityById(id),
      getBusinessLines(),
      getCompanies({ maxRecords: 200 }),
      getContacts({ maxRecords: 200 }),
    ])

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-syne">Modifier le prospect</h1>
          <p className="text-text-muted mt-2">{opportunity.name}</p>
        </div>

        <ProspectForm
          businessLines={businessLines}
          companies={companies}
          contacts={contacts}
          opportunity={opportunity}
          mode="edit"
        />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
