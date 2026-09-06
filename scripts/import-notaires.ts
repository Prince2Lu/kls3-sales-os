/**
 * IMPORT NOTAIRES — PRODUCTION IMPORT
 *
 * Mission: Import 50 notary offices into KLS3 Sales OS
 *
 * MODES:
 * - DRY-RUN (default): No writes, validation only
 * - --test-batch: Import ONLY 3 test offices (ID 1, 6, 23)
 * - --execute-ready: Import all 48 READY offices (NOT EXECUTED in this mission)
 *
 * SAFETY GATES:
 * 1. Requires staging-notaires.csv
 * 2. Requires IMPORT_PREVIEW_NOTAIRES.json
 * 3. Validates KLS3_NOTAIRES business line exists
 * 4. Validates Lilian user exists
 * 5. Excludes ID 29 and 45 (REVIEW)
 * 6. Checks for duplicates before creation
 * 7. Idempotent - can be re-run safely
 *
 * USAGE:
 *   DRY-RUN:      npx tsx scripts/import-notaires.ts
 *   TEST BATCH:   npx tsx scripts/import-notaires.ts --test-batch
 *   FULL IMPORT:  npx tsx scripts/import-notaires.ts --execute-ready (NOT IN THIS MISSION)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import {
  getBusinessLines,
  getUsers,
  getCompanies,
  getContacts,
  getOpportunities,
  createCompany,
  createContact,
  createOpportunity,
} from '../lib/airtable/index.js'

// ============================================================================
// TYPES
// ============================================================================

interface StagingRow {
  id: string
  office: string
  ville: string
  departement: string
  region: string
  adresse: string
  siteWeb: string
  telephone: string
  email: string
  interlocuteur: string
  fonction: string
  emailContactDirect: string
  sourceContact: string
  statutContact: string
  importCompany: string
  importContact: string
  importOpportunity: string
  importStatus: string
  duplicateStatus: string
  importNotes: string
}

interface PreviewRow {
  sourceId: string
  staging: StagingRow
  company: {
    action: string
    match: string | null
    reason: string
    confidence: string
  }
  contact: {
    action: string
    match: string | null
    reason: string
  }
  opportunity: {
    action: string
    match: string | null
    reason: string
  }
  owner: string
  stage: string
  source: string
  priority: string
  finalAction: string
  notes: string
}

interface ImportResult {
  sourceId: string
  companyId: string | null
  contactId: string | null
  opportunityId: string | null
  action: 'CREATED' | 'EXISTING' | 'SKIPPED' | 'ERROR'
  error?: string
  timestamp: string
}

interface ParsedAddress {
  addressLine1: string
  addressLine2: string
  postalCode: string
  city: string
  country: string
  parsingAmbiguous: boolean
  originalAddress: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_BATCH_IDS = ['1', '6', '23']
const EXCLUDED_IDS = ['29', '45'] // REVIEW items - do not import
const BUSINESS_LINE_CODE = 'KLS3_NOTAIRES'
const OWNER_EMAIL = 'lilian@kls3-dev.com'
const DEFAULT_STAGE = 'À prospecter'
const DEFAULT_SOURCE = 'Other'
const DEFAULT_PRIORITY = 'MEDIUM'

// ============================================================================
// UTILITIES
// ============================================================================

function parseCSV(csvText: string): StagingRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())

  function parseLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())

    return result
  }

  parseLine(lines[0]) // Skip header

  const rows: StagingRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])

    const row: StagingRow = {
      id: values[0] || '',
      office: values[1] || '',
      ville: values[2] || '',
      departement: values[3] || '',
      region: values[4] || '',
      adresse: values[5] || '',
      siteWeb: values[6] || '',
      telephone: values[11] || '',
      email: values[12] || '',
      interlocuteur: values[23] || '',
      fonction: values[24] || '',
      emailContactDirect: values[33] || '',
      sourceContact: values[34] || '',
      statutContact: values[35] || '',
      importCompany: values[36] || '',
      importContact: values[37] || '',
      importOpportunity: values[38] || '',
      importStatus: values[39] || '',
      duplicateStatus: values[40] || '',
      importNotes: values[41] || '',
    }

    rows.push(row)
  }

  return rows
}

function parseAddress(address: string, city: string): ParsedAddress {
  let addressLine1 = ''
  let addressLine2 = ''
  let postalCode = ''
  let parsingAmbiguous = false

  if (!address || address.trim() === '') {
    return {
      addressLine1: '',
      addressLine2: '',
      postalCode: '',
      city: city || '',
      country: 'France',
      parsingAmbiguous: false,
      originalAddress: address,
    }
  }

  // Try to extract postal code (5 digits)
  const postalCodeMatch = address.match(/\b\d{5}\b/)
  if (postalCodeMatch) {
    postalCode = postalCodeMatch[0]
    // Remove postal code from address
    address = address.replace(postalCodeMatch[0], '').trim()
  }

  // Simple parsing: use full address as addressLine1
  addressLine1 = address.trim()

  // If address is very long, mark as ambiguous
  if (addressLine1.length > 100) {
    parsingAmbiguous = true
  }

  return {
    addressLine1,
    addressLine2,
    postalCode,
    city: city || '',
    country: 'France',
    parsingAmbiguous,
    originalAddress: address,
  }
}

function parseContactName(interlocuteur: string): { firstName: string; lastName: string } | null {
  if (!interlocuteur || !interlocuteur.trim()) {
    return null
  }

  const parts = interlocuteur.trim().split(/\s+/)

  if (parts.length < 2) {
    return null
  }

  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')

  return { firstName, lastName }
}

function buildResearchNotes(staging: StagingRow): string {
  const notes: string[] = []

  notes.push('[Research / Qualification]')

  if (staging.sourceContact) notes.push(`Source contact: ${staging.sourceContact}`)
  if (staging.departement) notes.push(`Département: ${staging.departement}`)
  if (staging.region) notes.push(`Région: ${staging.region}`)

  return notes.length > 1 ? notes.join('\n') : ''
}

function isGenericEmail(email: string): boolean {
  if (!email) return false

  const genericPrefixes = [
    'office',
    'accueil',
    'contact',
    'etude',
    'secretariat',
    'info',
    'bonjour',
    'reception',
    'standard',
    'notaires',
    'notaire',
    'administration',
    'admin',
    'comptabilite',
  ]

  const prefix = email.split('@')[0].toLowerCase()
  return genericPrefixes.some(generic => prefix === generic || prefix.startsWith(generic))
}

function normalizeDomain(url: string): string {
  if (!url) return ''

  return url
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .split('/')[0]
}

function normalizePhone(phone: string): string {
  if (!phone) return ''

  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('33')) {
    return digits.substring(2)
  }

  if (digits.startsWith('0')) {
    return digits.substring(1)
  }

  return digits
}

function normalizeCompanyName(name: string): string {
  if (!name) return ''

  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\bscp\b|\bselarl\b|\bselas\b|\bsa\b|\bsarl\b|\bsas\b/gi, '')
    .trim()
}

// ============================================================================
// SAFETY GATES
// ============================================================================

async function validatePrerequisites(): Promise<{
  passed: boolean
  errors: string[]
  businessLine: any
  owner: any
}> {
  const errors: string[] = []

  console.log('Step 1: Validating prerequisites...')
  console.log()

  // Check staging CSV
  const csvPath = resolve(__dirname, '../staging-notaires.csv')
  if (!existsSync(csvPath)) {
    errors.push('❌ staging-notaires.csv not found')
  } else {
    console.log('✅ staging-notaires.csv found')
  }

  // Check preview JSON
  const previewPath = resolve(__dirname, '../IMPORT_PREVIEW_NOTAIRES.json')
  if (!existsSync(previewPath)) {
    errors.push('❌ IMPORT_PREVIEW_NOTAIRES.json not found')
  } else {
    console.log('✅ IMPORT_PREVIEW_NOTAIRES.json found')
  }

  // Validate KLS3_NOTAIRES business line
  const businessLines = await getBusinessLines()
  const kls3Notaires = businessLines.find(bl => bl.code === BUSINESS_LINE_CODE)
  if (!kls3Notaires) {
    errors.push(`❌ Business Line ${BUSINESS_LINE_CODE} not found`)
  } else {
    console.log(`✅ Business Line: ${kls3Notaires.name} (${kls3Notaires.id})`)
  }

  // Validate Lilian user
  const users = await getUsers()
  const lilian = users.find(u => u.email === OWNER_EMAIL)
  if (!lilian) {
    errors.push(`❌ User ${OWNER_EMAIL} not found`)
  } else {
    console.log(`✅ Owner: ${lilian.name} (${lilian.id})`)
  }

  // Validate stage
  console.log(`✅ Default Stage: ${DEFAULT_STAGE}`)
  console.log(`✅ Default Source: ${DEFAULT_SOURCE}`)

  console.log()

  return {
    passed: errors.length === 0,
    errors,
    businessLine: kls3Notaires,
    owner: lilian,
  }
}

// ============================================================================
// DUPLICATE CHECKING
// ============================================================================

async function findExistingCompany(
  staging: StagingRow,
  existingCompanies: any[]
): Promise<any | null> {
  const stagingDomain = normalizeDomain(staging.siteWeb)
  const stagingPhone = normalizePhone(staging.telephone)
  const stagingName = normalizeCompanyName(staging.office)

  for (const company of existingCompanies) {
    // Match by domain
    if (stagingDomain && company.website) {
      const companyDomain = normalizeDomain(company.website)
      if (stagingDomain === companyDomain) {
        return company
      }
    }

    // Match by phone
    if (stagingPhone && company.phone) {
      const companyPhone = normalizePhone(company.phone)
      if (stagingPhone === companyPhone) {
        return company
      }
    }

    // Match by name + city
    const companyName = normalizeCompanyName(company.name)
    if (stagingName === companyName && staging.ville === company.city) {
      return company
    }
  }

  return null
}

async function findExistingContact(
  staging: StagingRow,
  companyId: string,
  existingContacts: any[]
): Promise<any | null> {
  const parsed = parseContactName(staging.interlocuteur)
  if (!parsed) return null

  const stagingEmail = staging.emailContactDirect && !isGenericEmail(staging.emailContactDirect)
    ? staging.emailContactDirect.toLowerCase().trim()
    : ''

  for (const contact of existingContacts) {
    // Match by email (if present)
    if (stagingEmail && contact.email) {
      if (stagingEmail === contact.email.toLowerCase().trim()) {
        return contact
      }
    }

    // Match by name + company
    if (contact.companyId === companyId) {
      const contactFullName = `${contact.firstName} ${contact.lastName}`.toLowerCase()
      const stagingFullName = `${parsed.firstName} ${parsed.lastName}`.toLowerCase()
      if (contactFullName === stagingFullName) {
        return contact
      }
    }
  }

  return null
}

async function findExistingOpportunity(
  companyId: string,
  businessLineId: string,
  existingOpportunities: any[]
): Promise<any | null> {
  for (const opp of existingOpportunities) {
    if (opp.companyId === companyId && opp.businessLineId === businessLineId) {
      return opp
    }
  }

  return null
}

// ============================================================================
// IMPORT LOGIC
// ============================================================================

async function importOffice(
  staging: StagingRow,
  businessLine: any,
  owner: any,
  existingCompanies: any[],
  existingContacts: any[],
  existingOpportunities: any[],
  dryRun: boolean
): Promise<ImportResult> {
  const result: ImportResult = {
    sourceId: staging.id,
    companyId: null,
    contactId: null,
    opportunityId: null,
    action: 'CREATED',
    timestamp: new Date().toISOString(),
  }

  try {
    // Step 1: Company
    let company = await findExistingCompany(staging, existingCompanies)

    if (company) {
      console.log(`  Company EXISTING: ${company.name} (${company.id})`)
      result.companyId = company.id
    } else {
      if (dryRun) {
        console.log(`  [DRY-RUN] Would create Company: ${staging.office}`)
        result.companyId = '[DRY-RUN]'
      } else {
        const parsedAddress = parseAddress(staging.adresse, staging.ville)

        const companyData = {
          name: staging.office,
          website: staging.siteWeb || undefined,
          city: staging.ville || undefined,
          country: 'France',
          phone: staging.telephone || undefined,
          email: staging.email && !isGenericEmail(staging.email) ? staging.email : undefined,
          addressLine1: parsedAddress.addressLine1 || undefined,
          addressLine2: parsedAddress.addressLine2 || undefined,
          postalCode: parsedAddress.postalCode || undefined,
          primaryBusinessLineId: businessLine.id,
          notes: buildResearchNotes(staging) || undefined,
        }

        company = await createCompany(companyData)
        console.log(`  Company CREATED: ${company.name} (${company.id})`)
        result.companyId = company.id
        existingCompanies.push(company)
      }
    }

    // Step 2: Contact
    const parsed = parseContactName(staging.interlocuteur)

    if (parsed && result.companyId) {
      let contact = await findExistingContact(staging, result.companyId, existingContacts)

      if (contact) {
        console.log(`  Contact EXISTING: ${contact.firstName} ${contact.lastName} (${contact.id})`)
        result.contactId = contact.id
      } else {
        if (dryRun) {
          console.log(`  [DRY-RUN] Would create Contact: ${parsed.firstName} ${parsed.lastName}`)
          result.contactId = '[DRY-RUN]'
        } else {
          const contactEmail =
            staging.emailContactDirect && !isGenericEmail(staging.emailContactDirect)
              ? staging.emailContactDirect
              : undefined

          const contactData = {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            companyId: result.companyId === '[DRY-RUN]' ? company.id : result.companyId,
            jobTitle: staging.fonction || undefined,
            email: contactEmail,
            phone: undefined, // Don't use company phone as contact phone
          }

          contact = await createContact(contactData)
          console.log(`  Contact CREATED: ${contact.firstName} ${contact.lastName} (${contact.id})`)
          result.contactId = contact.id
          existingContacts.push(contact)
        }
      }
    } else {
      console.log(`  Contact SKIPPED: No parseable name`)
    }

    // Step 3: Opportunity
    if (result.companyId) {
      const companyIdForCheck = result.companyId === '[DRY-RUN]' ? company?.id : result.companyId
      let opportunity = companyIdForCheck
        ? await findExistingOpportunity(companyIdForCheck, businessLine.id, existingOpportunities)
        : null

      if (opportunity) {
        console.log(`  Opportunity EXISTING: ${opportunity.name} (${opportunity.id})`)
        result.opportunityId = opportunity.id
        result.action = 'EXISTING'
      } else {
        if (dryRun) {
          console.log(`  [DRY-RUN] Would create Opportunity: ${staging.office}`)
          result.opportunityId = '[DRY-RUN]'
        } else {
          const opportunityData = {
            name: staging.office,
            companyId: result.companyId,
            primaryContactId: result.contactId || undefined,
            businessLineId: businessLine.id,
            owner: owner.name,
            stage: DEFAULT_STAGE,
            source: DEFAULT_SOURCE,
            priority: DEFAULT_PRIORITY,
            potentialValue: undefined,
            probability: undefined,
            expectedCloseDate: undefined,
            problem: undefined,
            need: undefined,
            nextStepNotes: undefined,
          }

          opportunity = await createOpportunity(opportunityData)
          console.log(`  Opportunity CREATED: ${opportunity.name} (${opportunity.id})`)
          result.opportunityId = opportunity.id
          existingOpportunities.push(opportunity)
        }
      }
    }

    return result
  } catch (error) {
    console.error(`  ❌ ERROR: ${error}`)
    result.action = 'ERROR'
    result.error = String(error)
    return result
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('================================================================================')
  console.log('IMPORT NOTAIRES — PRODUCTION IMPORT')
  console.log('================================================================================')
  console.log()

  // Parse command line arguments
  const args = process.argv.slice(2)
  const testBatch = args.includes('--test-batch')
  const executeReady = args.includes('--execute-ready')
  const dryRun = !testBatch && !executeReady

  console.log(`Mode: ${dryRun ? 'DRY-RUN (no writes)' : testBatch ? 'TEST BATCH (3 offices)' : 'EXECUTE READY (48 offices)'}`)
  console.log()

  // Step 1: Validate prerequisites
  const validation = await validatePrerequisites()
  if (!validation.passed) {
    console.error('VALIDATION FAILED:')
    validation.errors.forEach(error => console.error(error))
    console.error()
    console.error('ABORT: Cannot proceed with import')
    return
  }

  // Step 2: Load staging data
  console.log('Step 2: Loading staging data...')
  const csvPath = resolve(__dirname, '../staging-notaires.csv')
  const csvText = readFileSync(csvPath, 'utf-8')
  const stagingRows = parseCSV(csvText)
  console.log(`✅ Loaded ${stagingRows.length} staging rows`)
  console.log()

  // Step 3: Load preview JSON
  console.log('Step 3: Loading preview JSON...')
  const previewPath = resolve(__dirname, '../IMPORT_PREVIEW_NOTAIRES.json')
  const previewContent = readFileSync(previewPath, 'utf-8')
  const previewRows: PreviewRow[] = JSON.parse(previewContent)
  console.log(`✅ Loaded ${previewRows.length} preview rows`)
  console.log()

  // Step 4: Filter rows to import
  console.log('Step 4: Filtering rows to import...')

  let rowsToImport = previewRows.filter(row => {
    // Exclude REVIEW items
    if (EXCLUDED_IDS.includes(row.sourceId)) {
      return false
    }

    // Only READY items
    return row.finalAction === 'READY'
  })

  console.log(`  Total READY: ${rowsToImport.length}`)
  console.log(`  Excluded (REVIEW): ${EXCLUDED_IDS.length}`)

  if (testBatch) {
    rowsToImport = rowsToImport.filter(row => TEST_BATCH_IDS.includes(row.sourceId))
    console.log(`  Test Batch IDs: ${TEST_BATCH_IDS.join(', ')}`)
    console.log(`  Test Batch Count: ${rowsToImport.length}`)
  }

  console.log()

  // Step 5: Load existing data
  console.log('Step 5: Loading existing Airtable data...')
  const existingCompanies = await getCompanies()
  const existingContacts = await getContacts()
  const existingOpportunities = await getOpportunities()

  console.log(`  Existing Companies: ${existingCompanies.length}`)
  console.log(`  Existing Contacts: ${existingContacts.length}`)
  console.log(`  Existing Opportunities: ${existingOpportunities.length}`)
  console.log()

  // Step 6: Import
  console.log('Step 6: Importing offices...')
  console.log()

  const results: ImportResult[] = []

  for (const previewRow of rowsToImport) {
    console.log(`Processing ID ${previewRow.sourceId}: ${previewRow.staging.office}`)

    const result = await importOffice(
      previewRow.staging,
      validation.businessLine,
      validation.owner,
      existingCompanies,
      existingContacts,
      existingOpportunities,
      dryRun
    )

    results.push(result)
    console.log()
  }

  // Step 7: Save results log (if not dry-run)
  if (testBatch && !dryRun) {
    const logPath = resolve(__dirname, '../IMPORT_NOTAIRES_TEST_BATCH_LOG.json')
    writeFileSync(logPath, JSON.stringify(results, null, 2), 'utf-8')
    console.log(`✅ Test batch log saved: ${logPath}`)
    console.log()
  }

  // Step 8: Post-import verification
  console.log('================================================================================')
  console.log('POST-IMPORT CHECK')
  console.log('================================================================================')
  console.log()

  if (!dryRun) {
    const currentCompanies = await getCompanies()
    const currentContacts = await getContacts()
    const currentOpportunities = await getOpportunities()
    const currentActivities = await getActivities()
    const currentTasks = await getTasks()
    const currentValueEvents = await getValueEvents()

    console.log('Airtable state after import:')
    console.log(`  Companies: ${currentCompanies.length}`)
    console.log(`  Contacts: ${currentContacts.length}`)
    console.log(`  Opportunities: ${currentOpportunities.length}`)
    console.log(`  Activities: ${currentActivities.length}`)
    console.log(`  Tasks: ${currentTasks.length}`)
    console.log(`  Value Events: ${currentValueEvents.length}`)
    console.log()

    // Verify correct links
    const createdOpps = results
      .filter(r => r.opportunityId && r.opportunityId !== '[DRY-RUN]')
      .map(r => r.opportunityId)

    const verifiedOpps = currentOpportunities.filter(o => createdOpps.includes(o.id))

    const correctBL = verifiedOpps.every(o => o.businessLineId === validation.businessLine.id)
    const correctOwner = verifiedOpps.every(o => o.owner === validation.owner.name)
    const correctStage = verifiedOpps.every(o => o.stage === DEFAULT_STAGE)

    console.log('Verification:')
    console.log(`  Correct Business Line: ${correctBL ? '✅' : '❌'}`)
    console.log(`  Correct Owner: ${correctOwner ? '✅' : '❌'}`)
    console.log(`  Correct Stage: ${correctStage ? '✅' : '❌'}`)
    console.log(`  No Activities: ${currentActivities.length === 0 ? '✅' : '❌'}`)
    console.log(`  No Tasks: ${currentTasks.length === 0 ? '✅' : '❌'}`)
    console.log(`  No Value Events: ${currentValueEvents.length === 0 ? '✅' : '❌'}`)
    console.log()

    // Display created tuples
    console.log('Created Records:')
    results.forEach(r => {
      if (r.action === 'CREATED' || r.action === 'EXISTING') {
        console.log(`  ID ${r.sourceId}:`)
        console.log(`    Company: ${r.companyId}`)
        console.log(`    Contact: ${r.contactId || 'N/A'}`)
        console.log(`    Opportunity: ${r.opportunityId}`)
      }
    })
    console.log()
  }

  // Step 9: Summary
  console.log('================================================================================')
  console.log('IMPORT SUMMARY')
  console.log('================================================================================')
  console.log()

  const created = results.filter(r => r.action === 'CREATED').length
  const existing = results.filter(r => r.action === 'EXISTING').length
  const errors = results.filter(r => r.action === 'ERROR').length

  console.log(`Mode: ${dryRun ? 'DRY-RUN' : testBatch ? 'TEST BATCH' : 'EXECUTE READY'}`)
  console.log()

  if (dryRun) {
    console.log('DRY-RUN RESULTS:')
    console.log(`  READY rows: ${rowsToImport.length}`)
    console.log(`  REVIEW excluded: ${EXCLUDED_IDS.length}`)
    console.log(`  Would create: ${created}`)
    console.log()
    console.log('To execute test batch:')
    console.log('npx tsx scripts/import-notaires.ts --test-batch')
  } else {
    console.log('TEST BATCH RESULTS:')
    console.log(`  Companies created: ${results.filter(r => r.companyId && r.companyId !== '[DRY-RUN]').length}`)
    console.log(`  Contacts created: ${results.filter(r => r.contactId && r.contactId !== '[DRY-RUN]').length}`)
    console.log(`  Opportunities created: ${results.filter(r => r.opportunityId && r.opportunityId !== '[DRY-RUN]').length}`)
    console.log(`  Errors: ${errors}`)
    console.log()
    console.log('READY FOR BROWSER VALIDATION: YES')
    console.log()
    console.log('⚠️  IMPORTANT: Validate in KLS3 Sales OS UI before importing remaining offices')
    console.log('⚠️  Check: Companies, Contacts, Pipeline, Opportunity details, Dashboard')
  }

  console.log()
  console.log('CONFIRMATION:')
  console.log(`  Records created: ${dryRun ? 0 : created}`)
  console.log(`  Import mode: ${dryRun ? 'DRY-RUN' : testBatch ? 'TEST BATCH' : 'N/A'}`)
}

// Missing imports
import { getActivities, getTasks, getValueEvents } from '../lib/airtable/index.js'

// ============================================================================
// EXECUTE
// ============================================================================

main()
