'use server'

import { revalidatePath } from 'next/cache'
import {
  completeImportBatch,
  createCompany,
  createContact,
  createImportBatch,
  deleteCompany,
  deleteContact,
  getActivities,
  getBusinessLineById,
  getBusinessLineByCode,
  getColdCallTargets,
  deleteColdCallTarget,
  getTasks,
  getCompanies,
  getContacts,
  getEmailRecipients,
  getEmailSuppressions,
  getImportBatches,
  getOpportunities,
  getRelationships,
  markImportBatchRolledBack,
  updateContact,
  updateCompany,
} from '@/lib/airtable'
import { getNotaryPilotCandidates, type NotaryDirectoryCandidate } from '@/lib/notaries/directory'
import { isNotaryImportEnabled } from '@/lib/prospecting/safety'
import { getCurrentOwner } from '@/lib/utils/current-owner'
import { denyUnlessRole } from '@/lib/auth/roles'
import { parseCsv } from '@/lib/imports/csv'
import { IMPORT_MAX_ROWS, planImport, type ImportPlan } from '@/lib/imports/sales-os-import'
import { findOrCreateProspectingTarget } from '@/lib/prospecting/target-manager'
import type { ColdCallTarget } from '@/types/domain'

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
  const denied = await denyUnlessRole()
  if (denied) return { success: false, error: denied }
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
      getCompanies(),
      getContacts(),
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
            if (notary.email && (!duplicate.email || duplicate.email.toLowerCase() === company.email?.toLowerCase())) {
              const updated = await updateContact(duplicate.id, {
                email: notary.email,
                notes: duplicate.notes?.includes(notary.sourceUrl)
                  ? duplicate.notes
                  : `${duplicate.notes ? `${duplicate.notes}\n` : ''}Source email direct : ${notary.sourceUrl}`,
              })
              const index = contacts.findIndex((item) => item.id === duplicate.id)
              contacts[index] = updated
            }
            continue
          }
          const contact = await createContact({
            firstName: notary.firstName || 'Maître',
            lastName: notary.lastName,
            companyId: company.id,
            businessLineIds: [businessLine.id],
            jobTitle: 'Notaire',
            email: notary.email || undefined,
            decisionMaker: false,
            importBatchId: batch.id,
            notes: `Source : ${candidate.sourceUrl}${notary.email ? `\nSource email direct : ${notary.sourceUrl}` : ''}`,
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

export interface ImportRollbackPreview {
  batchId: string
  batchName: string
  companiesToDelete: number
  contactsToDelete: number
  targetsToDelete: number
  safe: boolean
  reasons: string[]
  rolledBackAt: string | null
}

async function buildImportRollbackPreview(batchId?: string): Promise<ImportRollbackPreview | null> {
  const batches = await getImportBatches({ maxRecords: 50 })
  const batch = batchId ? batches.find((item) => item.id === batchId) : batches[0]
  if (!batch) return null

  const [companies, contacts, allContacts, opportunities, targets, relationships, recipients, activities, tasks] = await Promise.all([
    getCompanies({ importBatchId: batch.id }),
    getContacts({ importBatchId: batch.id }),
    getContacts(),
    getOpportunities(),
    getColdCallTargets({ includeArchived: true }),
    getRelationships(),
    getEmailRecipients(),
    getActivities(),
    getTasks(),
  ])

  const companyIds = new Set(companies.map((item) => item.id))
  const contactIds = new Set(contacts.map((item) => item.id))
  const reasons: string[] = []

  if (batch.rolledBackAt) {
    reasons.push('Ce lot a déjà été annulé.')
  }

  if (companies.length !== batch.companiesCreated) {
    reasons.push(
      `Traçabilité sociétés incomplète : ${companies.length} liée(s) au batch pour ${batch.companiesCreated} créée(s).`
    )
  }

  if (contacts.length !== batch.contactsCreated) {
    reasons.push(
      `Traçabilité contacts incomplète : ${contacts.length} lié(s) au batch pour ${batch.contactsCreated} créé(s).`
    )
  }

  const foreignContacts = allContacts.filter(
    (contact) =>
      !!contact.companyId &&
      companyIds.has(contact.companyId) &&
      !contactIds.has(contact.id)
  )
  if (foreignContacts.length > 0) {
    reasons.push(
      `${foreignContacts.length} contact(s) non créé(s) par ce lot sont désormais rattachés aux sociétés à supprimer.`
    )
  }

  const usedOpportunities = opportunities.filter(
    (opportunity) => !!opportunity.companyId && companyIds.has(opportunity.companyId)
  )
  if (usedOpportunities.length > 0) {
    reasons.push(`${usedOpportunities.length} Opportunity(s) utilisent déjà ces sociétés.`)
  }

  const batchTargets = targetsCreatedByBatch(batch, targets, activities, tasks)
  const batchTargetIds = new Set(batchTargets.map((target) => target.id))
  const usedTargets = targets.filter(
    (target) => !batchTargetIds.has(target.id) &&
      (companyIds.has(target.companyId) || (!!target.contactId && contactIds.has(target.contactId)))
  )
  if (usedTargets.length > 0) {
    reasons.push(`${usedTargets.length} cible(s) de prospection utilisent déjà ces données.`)
  }

  const usedRelationships = relationships.filter(
    (relationship) =>
      (!!relationship.companyId && companyIds.has(relationship.companyId)) ||
      (!!relationship.contactId && contactIds.has(relationship.contactId))
  )
  if (usedRelationships.length > 0) {
    reasons.push(`${usedRelationships.length} relation(s) stratégique(s) utilisent déjà ces données.`)
  }

  const usedRecipients = recipients.filter(
    (recipient) =>
      companyIds.has(recipient.companyId) ||
      (!!recipient.contactId && contactIds.has(recipient.contactId))
  )
  if (usedRecipients.length > 0) {
    reasons.push(`${usedRecipients.length} destinataire(s) de campagne utilisent déjà ces données.`)
  }

  return {
    batchId: batch.id,
    batchName: batch.name,
    companiesToDelete: companies.length,
    contactsToDelete: contacts.length,
    targetsToDelete: batchTargets.length,
    safe: reasons.length === 0,
    reasons,
    rolledBackAt: batch.rolledBackAt,
  }
}

export async function previewLastImportRollbackAction() {
  await getCurrentOwner()
  const preview = await buildImportRollbackPreview()
  if (!preview) return { success: false, error: 'Aucun import à annuler.' }
  return { success: true, preview }
}

export async function rollbackLastImportAction(batchId: string) {
  await getCurrentOwner()
  const denied = await denyUnlessRole()
  if (denied) return { success: false, error: denied }
  const preview = await buildImportRollbackPreview(batchId)
  if (!preview) return { success: false, error: 'Lot d’import introuvable.' }
  if (!preview.safe) {
    return {
      success: false,
      error: 'Rollback refusé : la traçabilité ou les dépendances ne permettent pas une suppression sûre.',
      preview,
    }
  }

  const batch = (await getImportBatches({ maxRecords: 50 })).find((item) => item.id === batchId)
  const [contacts, companies, targets, activities, tasks] = await Promise.all([
    getContacts({ importBatchId: batchId }),
    getCompanies({ importBatchId: batchId }),
    getColdCallTargets({ includeArchived: true }),
    getActivities(),
    getTasks(),
  ])
  const batchTargets = batch ? targetsCreatedByBatch(batch, targets, activities, tasks) : []

  for (const target of batchTargets) {
    await deleteColdCallTarget(target.id)
  }
  for (const contact of contacts) {
    await deleteContact(contact.id)
  }
  for (const company of companies) {
    await deleteCompany(company.id)
  }

  const summary = `Rollback Sales OS : ${companies.length} société(s), ${contacts.length} contact(s) et ${batchTargets.length} cible(s) de prospection supprimés.`
  await markImportBatchRolledBack(batchId, summary)

  revalidatePath('/imports')
  revalidatePath('/companies')
  revalidatePath('/contacts')
  return { success: true, summary }
}


// ============================================================================
// CSV IMPORT "SALES OS FRIENDLY" (Trello #58)
// ============================================================================

const CSV_MAX_BYTES = 1_000_000

/**
 * Prospecting targets created by a CSV batch: created by the importer during
 * the import window, still "À appeler", never worked (no activity, no task,
 * no Opportunity). IMPORT_BATCHES has no link to targets, and no Airtable
 * field is added, so these four conditions identify them safely.
 */
function targetsCreatedByBatch(
  batch: { createdAt: string; importedAt: string | null; importedBy: string },
  targets: ColdCallTarget[],
  activities: Array<{ coldCallTargetId: string | null }>,
  tasks: Array<{ coldCallTargetId: string | null }>
): ColdCallTarget[] {
  if (!batch.importedAt) return []
  const from = Date.parse(batch.createdAt)
  const to = Date.parse(batch.importedAt) + 60_000
  const worked = new Set([...activities, ...tasks].map((item) => item.coldCallTargetId).filter(Boolean))
  return targets.filter((target) => {
    const created = Date.parse(target.createdAt)
    return created >= from && created <= to && target.owner === batch.importedBy &&
      target.callStatus === 'À appeler' && !target.opportunityId && !worked.has(target.id)
  })
}

export interface CsvImportInput {
  csv: string
  fileName: string
  businessLineId: string
  createTargets: boolean
  defaultIndustry?: string
}

async function planCsv(input: CsvImportInput): Promise<{ plan?: ImportPlan; businessLineName?: string; error?: string }> {
  if (typeof input.csv !== 'string' || !input.csv.trim()) return { error: 'Fichier vide.' }
  if (input.csv.length > CSV_MAX_BYTES) return { error: 'Fichier trop volumineux (1 Mo maximum).' }
  if (!input.businessLineId) return { error: 'Choisissez la Business Line du lot.' }
  const businessLine = await getBusinessLineById(input.businessLineId).catch(() => null)
  if (!businessLine) return { error: 'Business Line introuvable.' }

  const table = parseCsv(input.csv)
  if (!table.rows.length) return { error: 'Aucune ligne à importer.' }
  const defaultIndustry = input.defaultIndustry?.trim().slice(0, 80) ?? ''

  const [companies, contacts, targets] = await Promise.all([
    getCompanies(), getContacts(), getColdCallTargets(),
  ])
  const plan = planImport({ rows: table.rows, headers: table.headers, companies, contacts, targets,
    businessLineId: businessLine.id, createTargets: !!input.createTargets })
  if (defaultIndustry) {
    for (const row of plan.rows) if (!row.data.industry) row.data.industry = defaultIndustry
  }
  if (plan.missingColumns.length) return { error: `Colonne obligatoire manquante : ${plan.missingColumns.join(', ')}.` }
  return { plan, businessLineName: businessLine.name }
}

export async function previewCsvImportAction(input: CsvImportInput) {
  await getCurrentOwner()
  try {
    const result = await planCsv(input)
    if (result.error || !result.plan) return { success: false as const, error: result.error ?? 'Aperçu impossible.' }
    return { success: true as const, plan: result.plan, businessLineName: result.businessLineName, maxRows: IMPORT_MAX_ROWS }
  } catch (error) {
    console.error('CSV import preview failed:', error instanceof Error ? error.message : error)
    return { success: false as const, error: 'Aperçu impossible. Réessayez dans quelques instants.' }
  }
}

export async function importCsvAction(input: CsvImportInput) {
  const owner = await getCurrentOwner()
  const denied = await denyUnlessRole()
  if (denied) return { success: false as const, error: denied }

  // The plan is recomputed here: the browser preview is never trusted.
  const planned = await planCsv(input)
  if (planned.error || !planned.plan) return { success: false as const, error: planned.error ?? 'Import impossible.' }
  const { plan } = planned
  const rows = plan.rows.filter((row) => !row.errors.length)
  if (!rows.length) return { success: false as const, error: 'Aucune ligne valide à importer.' }

  const batch = await createImportBatch({
    name: `CSV — ${String(input.fileName || 'fichier').slice(0, 80)} — ${new Date().toLocaleDateString('fr-FR')}`,
    source: 'Import CSV Sales OS',
    criteria: `BL ${planned.businessLineName} · ${rows.length} ligne(s) valide(s) · cibles de prospection : ${input.createTargets ? 'oui' : 'non'}`,
    requestedCount: plan.rows.length,
    importedBy: owner,
  })

  const stats = { companiesCreated: 0, companiesUpdated: 0, contactsCreated: 0, duplicatesSkipped: 0,
    excluded: plan.summary.rejected, errors: 0 }
  let targetsCreated = 0
  const companyIds = new Map<string, string>()
  const contactIds = new Map<string, string>()
  const failedLines: number[] = []

  for (const row of rows) {
    try {
      const data = row.data
      let companyId = row.company.id ?? companyIds.get(row.company.key) ?? null
      if (row.company.state === 'CREATE') {
        const company = await createCompany({
          name: data.companyName,
          primaryBusinessLineId: input.businessLineId,
          registryNumber: data.registryNumber || undefined,
          website: data.website || undefined,
          phone: data.companyPhone || undefined,
          email: data.companyEmail || undefined,
          addressLine1: data.address || undefined,
          postalCode: data.postalCode || undefined,
          city: data.city || undefined,
          country: data.country || 'France',
          industry: data.industry || undefined,
          companySize: data.companySize || undefined,
          importBatchId: batch.id,
        })
        companyId = company.id
        companyIds.set(row.company.key, company.id)
        stats.companiesCreated += 1
      } else {
        stats.duplicatesSkipped += 1
      }
      if (!companyId) throw new Error('Entreprise de la ligne précédente non créée')

      let contactId = row.contact.id ?? contactIds.get(row.contact.key) ?? null
      if (row.contact.state === 'CREATE') {
        const contact = await createContact({
          firstName: data.firstName || '—',
          lastName: data.lastName || data.firstName,
          companyId,
          businessLineIds: [input.businessLineId],
          jobTitle: data.jobTitle || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          linkedin: data.linkedin || undefined,
          notes: data.notes || undefined,
          importBatchId: batch.id,
        })
        contactId = contact.id
        contactIds.set(row.contact.key, contact.id)
        stats.contactsCreated += 1
      } else if (row.contact.state !== 'NONE') {
        stats.duplicatesSkipped += 1
      }

      if (row.target === 'CREATE') {
        const result = await findOrCreateProspectingTarget({
          companyId, businessLineId: input.businessLineId, contactId, owner, status: 'À appeler',
        })
        if (result.action === 'CREATE_NEW') targetsCreated += 1
      }
    } catch (error) {
      stats.errors += 1
      failedLines.push(row.line)
      console.error(`CSV import failed on line ${row.line}:`, error instanceof Error ? error.message : error)
    }
  }

  await completeImportBatch(batch.id, stats)
  revalidatePath('/imports')
  revalidatePath('/companies')
  revalidatePath('/contacts')
  revalidatePath('/cold-call')

  return {
    success: stats.errors === 0,
    batchId: batch.id,
    stats: { ...stats, targetsCreated },
    error: failedLines.length ? `Lignes non importées : ${failedLines.slice(0, 20).join(', ')}${failedLines.length > 20 ? '…' : ''}.` : undefined,
  }
}
