import Link from 'next/link'
import { getCompanies, getContacts } from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { loadEmailFollowUp } from './data'
import { FollowUpClient } from './follow-up-client'

export default async function EmailFollowUpPage() {
  await getCurrentOwner()
  const [{ rows }, companies, contacts] = await Promise.all([
    loadEmailFollowUp(), getCompanies({ maxRecords: 2000 }), getContacts({ maxRecords: 5000 }),
  ])
  const companyNames = new Map(companies.map((item) => [item.id, item.name]))
  const contactNames = new Map(contacts.map((item) => [item.id, `${item.firstName} ${item.lastName}`.trim()]))

  return <div className="space-y-6">
    <div>
      <Link href="/email-campaigns" className="text-sm text-accent hover:underline">← Campagnes email</Link>
      <h1 className="mt-2 text-4xl font-bold font-syne">Suivi des prospects</h1>
      <p className="mt-2 text-muted-foreground">Une ligne par adresse et activité commerciale. Sélectionnez les appels à planifier ; les signaux seuls ne créent aucune tâche.</p>
    </div>
    <FollowUpClient rows={rows.map((row) => ({ ...row, companyName: companyNames.get(row.companyId) ?? row.email,
      contactName: row.contactId ? contactNames.get(row.contactId) ?? null : null }))} />
  </div>
}
