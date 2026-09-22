import { NextRequest, NextResponse } from 'next/server'
import {
  getActivities, getCompanyById, getContactById, getEmailEvents, getEmailRecipients,
  getEmailSuppressions, getOpportunities, getRelationships, getTasks,
} from '@/lib/airtable'
import { getCurrentOwner } from '@/lib/utils/current-owner'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const exportedBy = await getCurrentOwner()
    const contactId = request.nextUrl.searchParams.get('contactId')?.trim()
    if (!contactId) return NextResponse.json({ error: 'contactId obligatoire' }, { status: 400 })

    const contact = await getContactById(contactId)
    const company = contact.companyId ? await getCompanyById(contact.companyId).catch(() => null) : null
    const [activities, tasks, relationships, companyOpportunities, recipients, events, suppressions] = await Promise.all([
      getActivities({ contactId }),
      getTasks({ contactId }),
      getRelationships({ contactId }),
      contact.companyId ? getOpportunities({ companyId: contact.companyId }) : Promise.resolve([]),
      getEmailRecipients(),
      getEmailEvents(),
      getEmailSuppressions({ activeOnly: false }),
    ])
    const relatedRecipients = recipients.filter((item) => item.contactId === contact.id || (!!company && item.companyId === company.id && item.email.toLowerCase() === contact.email?.toLowerCase()))
    const recipientIds = new Set(relatedRecipients.map((item) => item.id))
    const relatedSuppressions = suppressions.filter((item) =>
      item.contactId === contact.id ||
      (!!contact.email && item.email.toLowerCase() === contact.email.toLowerCase()) ||
      (!!company && item.companyId === company.id)
    )

    const payload = {
      exportMetadata: {
        generatedAt: new Date().toISOString(),
        exportedBy,
        purpose: 'Réponse à une demande d’accès RGPD',
      },
      contact,
      company,
      activities,
      tasks,
      relationships,
      opportunities: companyOpportunities.filter((item) => item.primaryContactId === contact.id),
      emailRecipients: relatedRecipients,
      emailEvents: events.filter((item) => recipientIds.has(item.recipientId)).map(({ rawPayload: _rawPayload, ...event }) => event),
      emailSuppressions: relatedSuppressions,
    }
    const safeName = `${contact.firstName}-${contact.lastName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="rgpd-${safeName}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Export impossible' }, { status: 500 })
  }
}
