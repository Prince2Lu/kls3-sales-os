import { getActivities, getBusinessLineByCode, getColdCallTargets, getCompanies, getContacts, getEmailCampaigns, getEmailRecipients, getEmailSuppressions } from '@/lib/airtable'
import { getBrevoTemplates } from '@/lib/brevo/client'
import { buildCampaignAudience } from '@/lib/brevo/campaign-audience'
import { CampaignsClient } from './campaigns-client'
import { getBrevoSendMode, getBrevoTestRecipientEmail } from '@/lib/prospecting/safety'
import Link from 'next/link'

export default async function EmailCampaignsPage() {
  const [campaigns, recipients, allCompanies, contacts, suppressions, businessLine, targets, activities] = await Promise.all([
    getEmailCampaigns(),
    getEmailRecipients(),
    getCompanies({ maxRecords: 2000 }),
    getContacts({ maxRecords: 5000 }),
    getEmailSuppressions(),
    getBusinessLineByCode('KLS3_NOTAIRES'),
    getColdCallTargets(), getActivities(),
  ])

  let templates: Awaited<ReturnType<typeof getBrevoTemplates>> = []
  let templateLoadError: string | null = null
  try {
    templates = await getBrevoTemplates()
  } catch (error) {
    templateLoadError = error instanceof Error ? error.message : 'Impossible de charger les modèles Brevo.'
  }

  const testRecipientEmail = getBrevoTestRecipientEmail()
  const companies = businessLine ? buildCampaignAudience({ companies: allCompanies, contacts, suppressions, targets, activities,
    recipients, campaigns, businessLineId: businessLine.id, testEmail: testRecipientEmail }) : []

  return <div className="space-y-8">
    <div>
      <h1 className="text-4xl font-bold font-syne">Campagnes email</h1>
      <p className="mt-2 text-muted-foreground">Sélection, aperçu, envoi Brevo et suivi des signaux.</p>
      <Link href="/email-campaigns/follow-up" className="mt-3 inline-block text-sm text-accent hover:underline">Voir le suivi des prospects et planifier les appels →</Link>
    </div>
    <CampaignsClient
      campaigns={campaigns.slice(0, 50)}
      recipients={recipients}
      companies={companies}
      templates={templates}
      templateLoadError={templateLoadError}
      sendMode={getBrevoSendMode()}
      testRecipientEmail={testRecipientEmail}
    />
  </div>
}
