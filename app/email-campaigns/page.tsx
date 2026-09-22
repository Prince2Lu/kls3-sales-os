import { getBusinessLineByCode, getCompanies, getContacts, getEmailCampaigns, getEmailRecipients, getEmailSuppressions } from '@/lib/airtable'
import { CampaignsClient } from './campaigns-client'
import { getBrevoSendMode, getBrevoTestRecipientEmail } from '@/lib/prospecting/safety'

export default async function EmailCampaignsPage() {
  const [campaigns, recipients, allCompanies, contacts, suppressions, businessLine] = await Promise.all([
    getEmailCampaigns({ maxRecords: 50 }), getEmailRecipients(), getCompanies({ maxRecords: 2000 }), getContacts({ maxRecords: 5000 }), getEmailSuppressions(), getBusinessLineByCode('KLS3_NOTAIRES'),
  ])
  const companies = allCompanies.filter((company) => company.primaryBusinessLineId === businessLine?.id).map((company) => {
    const direct = contacts.find((contact) => contact.companyId === company.id && contact.decisionMaker && !!contact.email)
    const email = direct?.email ?? company.email ?? ''
    const blocked = !email || suppressions.some((item) => item.active && ((item.scope === 'EMAIL' && item.email.toLowerCase() === email.toLowerCase()) || (item.scope === 'COMPANY' && item.companyId === company.id) || (item.scope === 'CONTACT' && item.contactId === direct?.id)))
    return { id: company.id, name: company.name, city: company.city, email, recipientLabel: direct ? `${direct.firstName} ${direct.lastName} · ${email}` : email || 'Email manquant', blocked }
  })
  return <div className="space-y-8">
    <div><h1 className="text-4xl font-bold font-syne">Campagnes email</h1><p className="mt-2 text-muted-foreground">Préparation, envoi Brevo et suivi des signaux.</p></div>
    <CampaignsClient campaigns={campaigns} recipients={recipients} companies={companies} sendMode={getBrevoSendMode()} testRecipientEmail={getBrevoTestRecipientEmail()} />
  </div>
}
