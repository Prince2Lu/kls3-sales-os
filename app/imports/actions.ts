'use server'

import { revalidatePath } from 'next/cache'
import {
  completeImportBatch,
  createCompany,
  createContact,
  createImportBatch,
  getBusinessLineByCode,
  getCompanies,
  getContacts,
  getEmailSuppressions,
  updateCompany,
} from '@/lib/airtable'
import { getNotaryPilotCandidates, type NotaryDirectoryCandidate } from '@/lib/notaries/directory'
import { isNotaryImportEnabled } from '@/lib/prospecting/safety'
import { getCurrentOwner } from '@/lib/utils/current-owner'

function normalize(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function domain(value: string | null | undefined): string {
  if (!value) return ''
  try { return new URL(value.startsWith('http') ? value : `https://${value}`).hostname.replace(/^www\./, '') } catch { return '' }
}

export async function previewNotaryImportAction(): Promise<{
  success: boolean
  candidates?: NotaryDirectoryCandidate[]
  error?: string
}> {
  await getCurrentOwner()
  if (!isNotaryImportEnabled()) {
    return { success: false, error: "Import désactivé : l’autorisation de réutilisation commerciale de la source doit être validée." }
  }
  try {
    const candidates = await getNotaryPilotCandidates({ limit: 25, minNotaries: 3, maxNotaries: 10 })
    if (candidates.length === 0) throw new Error("Aucun office correspondant n'a été trouvé")
    return { success: true, candidates }
  } catch (error) {
    console.error('Notary directory preview failed:', error)
    return { success: false, error: "L'annuaire officiel est momentanément indisponible. Réessayez dans quelques minutes." }
  }
}

export async function importNotaryPilotAction(candidates: NotaryDirectoryCandidate[]) {
  const owner = await getCurrentOwner()
  if (!isNotaryImportEnabled()) {
    return { success: false, error: "Import désactivé : l’autorisation de réutilisation commerciale de la source doit être validée." }
  }
  if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 25) {
    return { success: false, error: 'Le lot doit contenir entre 1 et 25 offices.' }
  }

  const safeCandidates = candidates.filter((item) =>
    item && typeof item.sourceUrl === 'string' && /^https:\/\/chambre-(interdep-08-10-51|bas-rhin)\.notaires\.fr\//.test(item.sourceUrl) &&
    item.notaries.length >= 3 && item.notaries.length <= 10
  )
  if (safeCandidates.length !== candidates.length) return { success: false, error: 'Le lot contient des données invalides.' }

  const businessLine = await getBusinessLineByCode('KLS3_NOTAIRES')
  if (!businessLine) return { success: false, error: "La business line KLS3_NOTAIRES n'existe pas." }

  const batch = await createImportBatch({
    name: `Pilote notaires — ${new Date().toLocaleDateString('fr-FR')}`,
    source: 'Annuaires officiels des notaires — Grand Est',
    criteria: 'Offices principaux de 3 à 10 notaires · lot maximum 25 · email générique accepté',
    requestedCount: safeCandidates.length,
    importedBy: owner,
  })

  const stats = { companiesCreated: 0, companiesUpdated: 0, contactsCreated: 0, duplicatesSkipped: 0, excluded: 0, errors: 0 }

  try {
    const [initialCompanies, initialContacts, suppressions] = await Promise.all([
      getCompanies({ maxRecords: 2000 }),
      getContacts({ maxRecords: 5000 }),
      getEmailSuppressions(),
    ])
    const companies = [...initialCompanies]
    const contacts = [...initialContacts]

    for (const candidate of safeCandidates) {
      try {
        const candidateDomain = domain(candidate.website)
        let company = companies.find((item) =>
          (!!candidateDomain && domain(item.website) === candidateDomain) ||
          (normalize(item.name) === normalize(candidate.name) && item.postalCode === candidate.postalCode) ||
          (!!candidate.email && item.email?.toLowerCase() === candidate.email.toLowerCase()) ||
          (!!candidate.phone && normalize(item.phone) === normalize(candidate.phone))
        )

        if (company) {
          stats.duplicatesSkipped += 1
          company = await updateCompany(company.id, {
            primaryBusinessLineId: company.primaryBusinessLineId ?? businessLine.id,
            website: company.website ?? candidate.website,
            email: company.email ?? candidate.email,
            phone: company.phone ?? candidate.phone,
            addressLine1: company.addressLine1 ?? candidate.addressLine1,
            postalCode: company.postalCode ?? candidate.postalCode,
            city: company.city ?? candidate.city,
            country: company.country ?? 'France',
            industry: company.industry ?? 'Notariat',
            notaryCount: candidate.notaries.length,
            importBatchId: batch.id,
            notes: company.notes ?? `Source : ${candidate.sourceUrl}`,
          })
          stats.companiesUpdated += 1
        } else {
          company = await createCompany({
            name: candidate.name,
            primaryBusinessLineId: businessLine.id,
            website: candidate.website || undefined,
            email: candidate.email || undefined,
            phone: candidate.phone || undefined,
            addressLine1: candidate.addressLine1,
            postalCode: candidate.postalCode,
            city: candidate.city,
            country: 'France',
            industry: 'Notariat',
            companySize: `${candidate.notaries.length} notaires`,
            notaryCount: candidate.notaries.length,
            importBatchId: batch.id,
            notes: `Source : ${candidate.sourceUrl}`,
          })
          companies.push(company)
          stats.companiesCreated += 1
        }

        const blocked = suppressions.some((item) => item.active && (
          (item.scope === 'EMAIL' && item.email.toLowerCase() === candidate.email.toLowerCase()) ||
          (item.scope === 'COMPANY' && item.companyId === company?.id)
        ))
        if (blocked) stats.excluded += 1

        for (const notary of candidate.notaries) {
          const duplicate = contacts.find((item) => item.companyId === company?.id &&
            normalize(item.firstName) === normalize(notary.firstName) && normalize(item.lastName) === normalize(notary.lastName))
          if (duplicate) {
            stats.duplicatesSkipped += 1
            continue
          }
          const contact = await createContact({
            firstName: notary.firstName || 'Maître',
            lastName: notary.lastName,
            companyId: company.id,
            businessLineIds: [businessLine.id],
            jobTitle: 'Notaire',
            decisionMaker: false,
            notes: `Source : ${candidate.sourceUrl}`,
          })
          contacts.push(contact)
          stats.contactsCreated += 1
        }
      } catch (error) {
        stats.errors += 1
        console.error(`Import failed for ${candidate.name}:`, error)
      }
    }
  } catch (error) {
    stats.errors += safeCandidates.length
    console.error('Pilot import failed:', error)
  }

  await completeImportBatch(batch.id, stats)
  revalidatePath('/imports')
  revalidatePath('/companies')
  revalidatePath('/contacts')
  return { success: stats.errors === 0, batchId: batch.id, stats, error: stats.errors ? `${stats.errors} office(s) n'ont pas pu être traités.` : undefined }
}
