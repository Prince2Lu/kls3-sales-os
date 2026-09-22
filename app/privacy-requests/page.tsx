import { getContacts } from '@/lib/airtable'
import { PrivacyExportClient } from './privacy-export-client'

export default async function PrivacyRequestsPage() {
  const contacts = await getContacts({ maxRecords: 5000 })
  return <div className="space-y-8">
    <div>
      <h1 className="text-4xl font-bold font-syne">Demandes RGPD</h1>
      <p className="mt-2 text-muted-foreground">Exporter les données rattachées à un contact pour traiter une demande d’accès.</p>
    </div>
    <PrivacyExportClient contacts={contacts.map((contact) => ({ id: contact.id, name: `${contact.firstName} ${contact.lastName}`, email: contact.email }))} />
  </div>
}
