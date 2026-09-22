import { getCompanies, getContacts, getEmailSuppressions } from '@/lib/airtable'
import { SuppressionsClient } from './suppressions-client'

export default async function EmailSuppressionsPage() {
  const [suppressions, companies, contacts] = await Promise.all([
    getEmailSuppressions({ activeOnly: false }),
    getCompanies({ maxRecords: 2000 }),
    getContacts({ maxRecords: 5000 }),
  ])

  return <div className="space-y-8">
    <div>
      <h1 className="text-4xl font-bold font-syne">Exclusions email</h1>
      <p className="mt-2 text-muted-foreground">Enregistrer et contrôler les oppositions, désabonnements et adresses invalides.</p>
    </div>
    <SuppressionsClient
      suppressions={suppressions}
      companies={companies.map((item) => ({ id: item.id, name: item.name, email: item.email }))}
      contacts={contacts.map((item) => ({ id: item.id, companyId: item.companyId, name: `${item.firstName} ${item.lastName}`, email: item.email }))}
    />
  </div>
}
