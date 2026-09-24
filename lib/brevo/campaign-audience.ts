import type { Activity, ColdCallTarget, Company, Contact, EmailCampaign, EmailRecipient, EmailSuppression } from '@/types/domain'

export interface AudienceOption {
  contactId: string | null
  email: string
  label: string
  blockedReason: string | null
}

export interface AudienceOffice {
  id: string
  name: string
  city: string | null
  postalCode: string | null
  options: AudienceOption[]
  blockedReason: string | null
  previouslySent: boolean
  alreadyInDraft: boolean
}

const sentStatuses = new Set(['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'])

export function buildCampaignAudience(input: {
  companies: Company[]
  contacts: Contact[]
  suppressions: EmailSuppression[]
  targets: ColdCallTarget[]
  activities: Activity[]
  recipients: EmailRecipient[]
  campaigns: EmailCampaign[]
  businessLineId: string
  testEmail: string | null
  excludeCampaignId?: string
}): AudienceOffice[] {
  const { companies, contacts, suppressions, targets, activities, recipients, campaigns, businessLineId, testEmail, excludeCampaignId } = input
  const campaignIds = new Set(campaigns.filter((item) => item.businessLineId === businessLineId).map((item) => item.id))
  const draftIds = new Set(campaigns.filter((item) => item.businessLineId === businessLineId && item.status === 'DRAFT' && item.id !== excludeCampaignId).map((item) => item.id))
  const sentCompanyIds = new Set(recipients.filter((item) => sentStatuses.has(item.status) &&
    campaignIds.has(item.campaignId) && item.email.toLowerCase() !== testEmail?.toLowerCase()).map((item) => item.companyId))
  const draftCompanyIds = new Set(recipients.filter((item) => item.status === 'READY' && draftIds.has(item.campaignId) &&
    item.email.toLowerCase() !== testEmail?.toLowerCase()).map((item) => item.companyId))
  const contactsByCompany = new Map<string, Contact[]>()
  for (const contact of contacts) {
    if (!contact.companyId) continue
    const group = contactsByCompany.get(contact.companyId) ?? []
    group.push(contact)
    contactsByCompany.set(contact.companyId, group)
  }

  return companies.filter((company) => company.primaryBusinessLineId === businessLineId).map((company) => {
    const companyTargets = targets.filter((item) => !item.archived && item.companyId === company.id && item.businessLineId === businessLineId)
    const companySuppressed = suppressions.some((item) => item.active && item.scope === 'COMPANY' && item.companyId === company.id)
    const companyDeclined = companyTargets.some((item) => item.callStatus === 'Pas intéressé')
    const alreadyInDraft = draftCompanyIds.has(company.id)
    const choices: { contactId: string | null; email: string; label: string }[] = (contactsByCompany.get(company.id) ?? []).filter((item) => item.decisionMaker && !!item.email?.trim())
      .map((contact) => ({ contactId: contact.id, email: contact.email!.trim(), label: `${contact.firstName} ${contact.lastName}`.trim() }))
    if (company.email?.trim()) choices.push({ contactId: null, email: company.email.trim(), label: 'Email de l’office' })
    const seenEmails = new Set<string>()
    const options = choices.filter((choice) => {
      const email = choice.email.toLowerCase()
      if (seenEmails.has(email)) return false
      seenEmails.add(email)
      return true
    }).map((choice): AudienceOption => {
      const email = choice.email.toLowerCase()
      const contactTargets = companyTargets.filter((item) => item.contactId === choice.contactId)
      const latestCall = activities.filter((activity) => activity.type === 'CALL' && (
        (!!activity.coldCallTargetId && contactTargets.some((item) => item.id === activity.coldCallTargetId)) ||
        (!activity.coldCallTargetId && !!choice.contactId && activity.contactId === choice.contactId)
      )).sort((a, b) => b.date.localeCompare(a.date))[0]
      const declined = companyDeclined ||
        (latestCall?.result === 'NOT_INTERESTED' && !contactTargets.some((item) =>
          item.callStatus !== 'Pas intéressé' && item.updatedAt > latestCall.date))
      const suppressed = suppressions.some((item) => item.active && (
        (item.scope === 'EMAIL' && item.email.trim().toLowerCase() === email) ||
        (item.scope === 'CONTACT' && !!choice.contactId && item.contactId === choice.contactId)
      ))
      return { ...choice, blockedReason: companySuppressed ? 'Office exclu' : alreadyInDraft ? 'Déjà dans un brouillon' : suppressed ? 'Opposition ou désabonnement' : declined ? 'Pas intéressé' : null }
    })
    return {
      id: company.id, name: company.name, city: company.city, postalCode: company.postalCode,
      options, previouslySent: sentCompanyIds.has(company.id), alreadyInDraft,
      blockedReason: companySuppressed ? 'Office exclu' : alreadyInDraft ? 'Déjà dans un brouillon' : !options.length ? 'Aucun email de décideur ou de l’office'
        : options.every((option) => option.blockedReason) ? 'Tous les destinataires sont exclus' : null,
    }
  })
}
