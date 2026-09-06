// IMPORT PREVIEW NOTAIRES — READ-ONLY MISSION
// Compare Google Sheet staging with current Airtable data
// CRITICAL: Makes ZERO modifications to any data or schema

import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

// Load .env.local from project root
config({ path: resolve(__dirname, '../.env.local') })

import {
  getBusinessLines,
  getCompanies,
  getContacts,
  getOpportunities,
  getUsers,
} from '@/lib/airtable'
import type { Company, Contact, Opportunity, User, BusinessLine } from '@/types/domain'

// ============================================================================
// GOOGLE SHEET FETCHING
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

async function fetchGoogleSheet(): Promise<StagingRow[]> {
  const sheetId = '1Spqog4ysuwufQZS85WLAtZYMEv6hEtKEI5ANkMVg2vA'
  const sheetName = 'Offices - étude'

  // Try CSV export first (requires public sheet or will be manually downloaded)
  const csvPath = resolve(__dirname, '../staging-notaires.csv')

  // Check if CSV file exists locally
  try {
    const fs = require('fs')
    if (fs.existsSync(csvPath)) {
      console.log(`✅ Using local CSV file: ${csvPath}`)
      const csvText = fs.readFileSync(csvPath, 'utf-8')
      return parseCSV(csvText)
    }
  } catch (err) {
    console.log(`ℹ️  Local CSV not found: ${csvPath}`)
  }

  // Try to fetch from Google Sheets (requires public access)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`

  console.log(`Fetching Google Sheet: ${csvUrl}`)

  const response = await fetch(csvUrl)

  if (!response.ok) {
    console.error(`❌ Failed to fetch Google Sheet: ${response.status} ${response.statusText}`)
    console.error()
    console.error('SOLUTION 1: Make the Google Sheet public and re-run')
    console.error('SOLUTION 2: Download the sheet as CSV:')
    console.error(`  1. Open: https://docs.google.com/spreadsheets/d/${sheetId}/edit`)
    console.error(`  2. File → Download → Comma Separated Values (.csv)`)
    console.error(`  3. Save as: ${csvPath}`)
    console.error(`  4. Re-run this script`)
    console.error()
    throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`)
  }

  const csvText = await response.text()
  return parseCSV(csvText)
}

function parseCSV(csvText: string): StagingRow[] {

  // Parse CSV (handles quoted values containing commas)
  const lines = csvText.split('\n').filter(line => line.trim())

  // Simple CSV parser that respects quotes
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

  const headers = parseLine(lines[0])

  console.log(`CSV Headers: ${headers.join(', ')}`)
  console.log(`Total rows (including header): ${lines.length}`)

  const rows: StagingRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])

    // Map to StagingRow structure
    // CSV Column indices (0-based):
    // 0: ID, 1: Office, 2: Ville, 3: Département, 4: Région, 5: Adresse
    // 6: Site web, 11: Téléphone, 12: Email, 23: Interlocuteur, 24: Fonction
    // 33: Email contact direct, 34: Source contact, 35: Statut contact
    // 36: Import Company, 37: Import Contact, 38: Import Opportunity
    // 39: Import Status, 40: Duplicate Status, 41: Import Notes
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

  console.log(`Parsed ${rows.length} staging rows`)

  return rows
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

function normalizeDomain(url: string): string {
  if (!url) return ''

  return url
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/^www\./, '') // Remove www
    .replace(/\/$/, '') // Remove trailing slash
    .split('/')[0] // Keep only domain
}

function normalizePhone(phone: string): string {
  if (!phone) return ''

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // French phone: 0X XX XX XX XX or +33 X XX XX XX XX
  if (digits.startsWith('33')) {
    return digits.substring(2) // Remove +33
  }

  if (digits.startsWith('0')) {
    return digits.substring(1) // Remove leading 0
  }

  return digits
}

function normalizeCompanyName(name: string): string {
  if (!name) return ''

  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces → single
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
    .replace(/\bscp\b|\bselarl\b|\bselas\b|\bsa\b|\bsarl\b|\bsas\b/gi, '') // Remove legal forms
    .trim()
}

function normalizeAddress(address: string): string {
  if (!address) return ''

  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '')
}

function normalizePostalCode(postalCode: string): string {
  if (!postalCode) return ''
  return postalCode.trim()
}

function normalizeCity(city: string): string {
  if (!city) return ''
  return city.toLowerCase().trim()
}

function normalizeEmail(email: string): string {
  if (!email) return ''
  return email.toLowerCase().trim()
}

function normalizePersonName(name: string): string {
  if (!name) return ''
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

function isGenericEmail(email: string): boolean {
  if (!email) return false

  const genericPrefixes = [
    'office', 'accueil', 'contact', 'etude', 'secretariat',
    'info', 'bonjour', 'reception', 'standard', 'notaires',
    'notaire', 'administration', 'admin', 'comptabilite'
  ]

  const prefix = email.split('@')[0].toLowerCase()
  return genericPrefixes.some(generic => prefix === generic || prefix.startsWith(generic))
}

// ============================================================================
// SIMILARITY HELPERS
// ============================================================================

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

function similarityRatio(a: string, b: string): number {
  const distance = levenshtein(a, b)
  const maxLength = Math.max(a.length, b.length)

  if (maxLength === 0) return 1.0

  return 1.0 - distance / maxLength
}

// ============================================================================
// DEDUPLICATION LOGIC
// ============================================================================

interface CompanyMatch {
  action: 'CREATE' | 'EXISTING' | 'REVIEW'
  match: Company | null
  reason: string
  confidence: 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE'
}

function findCompanyMatch(
  staging: StagingRow,
  existingCompanies: Company[]
): CompanyMatch {
  const stagingDomain = normalizeDomain(staging.siteWeb)
  const stagingPhone = normalizePhone(staging.telephone)
  const stagingName = normalizeCompanyName(staging.office)
  const stagingAddress = normalizeAddress(staging.adresse)
  const stagingPostal = normalizePostalCode(staging.departement.substring(0, 5)) // Assuming postal in departement
  const stagingCity = normalizeCity(staging.ville)

  // SIGNAL STRONG: Domain or Phone match
  for (const company of existingCompanies) {
    // Domain match
    if (stagingDomain && company.website) {
      const companyDomain = normalizeDomain(company.website)
      if (companyDomain && stagingDomain === companyDomain) {
        return {
          action: 'EXISTING',
          match: company,
          reason: `Domain match: ${stagingDomain}`,
          confidence: 'STRONG'
        }
      }
    }

    // Phone match
    if (stagingPhone && company.phone) {
      const companyPhone = normalizePhone(company.phone)
      if (companyPhone && stagingPhone === companyPhone) {
        return {
          action: 'EXISTING',
          match: company,
          reason: `Phone match: ${stagingPhone}`,
          confidence: 'STRONG'
        }
      }
    }
  }

  // SIGNAL MEDIUM: Address + Postal OR Name similarity + City
  for (const company of existingCompanies) {
    // Address + Postal match
    if (stagingAddress && stagingPostal && company.addressLine1 && company.postalCode) {
      const companyAddress = normalizeAddress(company.addressLine1)
      const companyPostal = normalizePostalCode(company.postalCode)

      if (companyAddress && companyPostal &&
          stagingAddress.includes(companyAddress.substring(0, 10)) &&
          stagingPostal === companyPostal) {
        return {
          action: 'REVIEW',
          match: company,
          reason: `Address+Postal similar: ${companyAddress} ${companyPostal}`,
          confidence: 'MEDIUM'
        }
      }
    }

    // Name similarity + City match
    if (stagingName && stagingCity && company.name && company.city) {
      const companyName = normalizeCompanyName(company.name)
      const companyCity = normalizeCity(company.city)

      const nameSimilarity = similarityRatio(stagingName, companyName)

      if (nameSimilarity > 0.8 && stagingCity === companyCity) {
        return {
          action: 'REVIEW',
          match: company,
          reason: `Name ${(nameSimilarity * 100).toFixed(0)}% similar + City match: ${stagingCity}`,
          confidence: 'MEDIUM'
        }
      }
    }
  }

  // SIGNAL WEAK: Name similarity only
  for (const company of existingCompanies) {
    if (stagingName && company.name) {
      const companyName = normalizeCompanyName(company.name)
      const nameSimilarity = similarityRatio(stagingName, companyName)

      if (nameSimilarity > 0.85) {
        return {
          action: 'REVIEW',
          match: company,
          reason: `Name ${(nameSimilarity * 100).toFixed(0)}% similar (no city/address confirmation)`,
          confidence: 'WEAK'
        }
      }
    }
  }

  // No match found
  return {
    action: 'CREATE',
    match: null,
    reason: 'No duplicate found',
    confidence: 'NONE'
  }
}

// ============================================================================
// CONTACT MATCHING
// ============================================================================

interface ContactMatch {
  action: 'CREATE' | 'EXISTING' | 'REVIEW' | 'SKIP'
  match: Contact | null
  reason: string
}

function findContactMatch(
  staging: StagingRow,
  companyMatch: CompanyMatch,
  existingContacts: Contact[]
): ContactMatch {
  // SKIP if no interlocuteur
  if (!staging.interlocuteur || staging.interlocuteur.trim() === '') {
    return {
      action: 'SKIP',
      match: null,
      reason: 'No interlocuteur in staging'
    }
  }

  // Parse interlocuteur (handle "Prénom NOM", "Prénom-Composé NOM", "Prénom NOM-COMPOSÉ")
  // French names often have: François-Xavier, Marie-Claire, BRACQ-MERLEN, etc.
  const interlocuteur = staging.interlocuteur.trim()

  // Split by spaces to separate first name(s) from last name(s)
  const parts = interlocuteur.split(/\s+/)

  if (parts.length < 2) {
    return {
      action: 'SKIP',
      match: null,
      reason: 'Cannot reliably parse first/last name (single word)'
    }
  }

  // Strategy: Simple and reliable
  // - First word = Prénom (can include hyphens: Jean-Pierre, Marie-Claire)
  // - Rest = Nom (can include hyphens: DUPONT-MARTIN, DE LA FONTAINE)
  // This works for: "François-Xavier BEAUCHET", "Jean DUPONT-CARIOT", "Marie DE GAULLE"

  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')

  if (!firstName || !lastName) {
    return {
      action: 'SKIP',
      match: null,
      reason: 'Empty first or last name after parsing'
    }
  }

  // Do NOT skip if email is generic - just don't use it for the Contact
  // A Contact can exist without email
  const hasGenericEmail = staging.emailContactDirect && isGenericEmail(staging.emailContactDirect)

  // Only use email if it's not generic
  const stagingEmail = hasGenericEmail ? '' : normalizeEmail(staging.emailContactDirect)
  const stagingName = normalizePersonName(`${firstName} ${lastName}`)

  // Priority 1: Email match (only if non-generic email)
  if (stagingEmail) {
    for (const contact of existingContacts) {
      if (contact.email && normalizeEmail(contact.email) === stagingEmail) {
        return {
          action: 'EXISTING',
          match: contact,
          reason: `Email match: ${stagingEmail}`
        }
      }
    }
  }

  // Priority 2: Name + Company match
  if (companyMatch.match) {
    for (const contact of existingContacts) {
      if (contact.companyId === companyMatch.match.id) {
        const contactName = normalizePersonName(`${contact.firstName} ${contact.lastName}`)
        const nameSimilarity = similarityRatio(stagingName, contactName)

        if (nameSimilarity > 0.85) {
          return {
            action: 'REVIEW',
            match: contact,
            reason: `Name ${(nameSimilarity * 100).toFixed(0)}% similar + same Company`
          }
        }
      }
    }
  }

  // No match found - can create
  return {
    action: 'CREATE',
    match: null,
    reason: 'No duplicate found'
  }
}

// ============================================================================
// OPPORTUNITY MATCHING
// ============================================================================

interface OpportunityMatch {
  action: 'CREATE' | 'EXISTING' | 'REVIEW'
  match: Opportunity | null
  reason: string
}

function findOpportunityMatch(
  companyMatch: CompanyMatch,
  existingOpportunities: Opportunity[],
  kls3NotairesId: string
): OpportunityMatch {
  // If no company match, can create opportunity
  if (!companyMatch.match) {
    return {
      action: 'CREATE',
      match: null,
      reason: 'New Company → New Opportunity'
    }
  }

  // Check if opportunity already exists for this Company + KLS3_NOTAIRES
  const matchingOpportunities = existingOpportunities.filter(
    opp => opp.companyId === companyMatch.match!.id &&
           opp.businessLineId === kls3NotairesId
  )

  if (matchingOpportunities.length === 0) {
    return {
      action: 'CREATE',
      match: null,
      reason: 'Existing Company, no KLS3_NOTAIRES opportunity'
    }
  }

  if (matchingOpportunities.length === 1) {
    return {
      action: 'EXISTING',
      match: matchingOpportunities[0],
      reason: `Found existing KLS3_NOTAIRES opportunity: ${matchingOpportunities[0].stage}`
    }
  }

  // Multiple opportunities = REVIEW
  return {
    action: 'REVIEW',
    match: matchingOpportunities[0],
    reason: `Multiple KLS3_NOTAIRES opportunities found (${matchingOpportunities.length})`
  }
}

// ============================================================================
// PREVIEW GENERATION
// ============================================================================

interface PreviewRow {
  sourceId: string
  officeSource: string
  ville: string
  companyAction: 'CREATE' | 'EXISTING' | 'REVIEW'
  companyMatch: string
  companyMatchReason: string
  contact: string
  contactAction: 'CREATE' | 'EXISTING' | 'REVIEW' | 'SKIP'
  contactMatch: string
  opportunityAction: 'CREATE' | 'EXISTING' | 'REVIEW'
  existingOpportunity: string
  owner: string
  stage: string
  sourceCRM: string
  priority: string
  duplicateStatus: string
  finalAction: 'READY' | 'REVIEW' | 'BLOCKED'
  notes: string
}

async function generatePreview() {
  console.log('='.repeat(80))
  console.log('IMPORT PREVIEW NOTAIRES — READ-ONLY MISSION')
  console.log('='.repeat(80))
  console.log()

  // 1. Fetch Google Sheet
  console.log('Step 1: Fetching Google Sheet staging data...')
  const stagingRows = await fetchGoogleSheet()
  console.log(`✅ Loaded ${stagingRows.length} staging rows`)
  console.log()

  // 2. Load Airtable data
  console.log('Step 2: Loading current Airtable data...')
  const [businessLines, companies, contacts, opportunities, users] = await Promise.all([
    getBusinessLines(),
    getCompanies({ maxRecords: 1000 }),
    getContacts({ maxRecords: 1000 }),
    getOpportunities({ maxRecords: 1000 }),
    getUsers({ maxRecords: 100 })
  ])

  console.log(`✅ Business Lines: ${businessLines.length}`)
  console.log(`✅ Companies: ${companies.length}`)
  console.log(`✅ Contacts: ${contacts.length}`)
  console.log(`✅ Opportunities: ${opportunities.length}`)
  console.log(`✅ Users: ${users.length}`)
  console.log()

  // 3. Verify critical data
  console.log('Step 3: Verifying critical configuration...')

  const kls3Notaires = businessLines.find(bl => bl.code === 'KLS3_NOTAIRES')
  if (!kls3Notaires) {
    throw new Error('BLOCKER: KLS3_NOTAIRES Business Line not found')
  }
  console.log(`✅ KLS3_NOTAIRES found: ${kls3Notaires.id}`)

  const lilian = users.find(u => u.name.toLowerCase().includes('lilian') || u.email?.toLowerCase().includes('lilian'))
  if (!lilian) {
    throw new Error('BLOCKER: Lilian user not found in USERS table')
  }
  console.log(`✅ Lilian found: ${lilian.id} (${lilian.name}, ${lilian.email})`)
  console.log()

  // 4. STAGING INTEGRITY CHECK
  console.log('Step 4: STAGING INTEGRITY CHECK...')
  console.log()

  const stagingReviewRows = stagingRows.filter(row =>
    (row.importStatus && row.importStatus.toUpperCase().includes('REVIEW')) ||
    (row.importCompany && row.importCompany.toUpperCase().includes('REVIEW')) ||
    (row.importContact && row.importContact.toUpperCase().includes('REVIEW')) ||
    (row.importOpportunity && row.importOpportunity.toUpperCase().includes('REVIEW'))
  )

  const stagingReadyRows = stagingRows.filter(row =>
    (row.importStatus && row.importStatus.toUpperCase().includes('READY'))
  )

  console.log(`  Total rows: ${stagingRows.length}`)
  console.log(`  READY_DATA rows: ${stagingReadyRows.length}`)
  console.log(`  REVIEW rows: ${stagingReviewRows.length}`)
  if (stagingReviewRows.length > 0) {
    console.log(`  REVIEW IDs: ${stagingReviewRows.map(r => r.id).join(', ')}`)
  }
  console.log()

  // 5. Process each staging row
  console.log('Step 5: Processing staging rows...')

  const previewRows: PreviewRow[] = []
  const previewJSON: any[] = []

  let stats = {
    company: { create: 0, existing: 0, review: 0 },
    contact: { create: 0, existing: 0, review: 0, skip: 0 },
    opportunity: { create: 0, existing: 0, review: 0 },
    final: { ready: 0, review: 0, blocked: 0 }
  }

  let contactParsingStats = {
    interlocuteursPresents: 0,
    contactsParses: 0,
    contactsCreate: 0,
    contactsReview: 0,
    contactsSkip: 0,
    contactsAvecEmailDirect: 0,
    contactsSansEmailDirect: 0
  }

  for (const staging of stagingRows) {
    // Company matching
    const companyMatch = findCompanyMatch(staging, companies)

    // Contact matching and parsing stats
    if (staging.interlocuteur && staging.interlocuteur.trim()) {
      contactParsingStats.interlocuteursPresents++
    }

    const contactMatch = findContactMatch(staging, companyMatch, contacts)

    if (staging.interlocuteur && staging.interlocuteur.trim() && contactMatch.action !== 'SKIP') {
      contactParsingStats.contactsParses++
    }

    if (contactMatch.action === 'CREATE') {
      contactParsingStats.contactsCreate++
    } else if (contactMatch.action === 'REVIEW') {
      contactParsingStats.contactsReview++
    } else if (contactMatch.action === 'SKIP') {
      contactParsingStats.contactsSkip++
    }

    if (staging.emailContactDirect && staging.emailContactDirect.trim() && !isGenericEmail(staging.emailContactDirect)) {
      contactParsingStats.contactsAvecEmailDirect++
    } else if (contactMatch.action === 'CREATE' || contactMatch.action === 'REVIEW') {
      contactParsingStats.contactsSansEmailDirect++
    }

    // Opportunity matching
    const opportunityMatch = findOpportunityMatch(companyMatch, opportunities, kls3Notaires.id)

    // Determine final action
    let finalAction: 'READY' | 'REVIEW' | 'BLOCKED' = 'READY'
    let notes: string[] = []

    // Check for REVIEW conditions from staging columns
    if (staging.importStatus && staging.importStatus.toUpperCase().includes('REVIEW')) {
      finalAction = 'REVIEW'
      notes.push('Import Status = REVIEW in staging')
    }

    if (staging.importCompany && staging.importCompany.toUpperCase().includes('REVIEW')) {
      finalAction = 'REVIEW'
      notes.push('Import Company = REVIEW in staging')
    }

    if (staging.importContact && staging.importContact.toUpperCase().includes('REVIEW')) {
      finalAction = 'REVIEW'
      notes.push('Import Contact = REVIEW in staging')
    }

    if (staging.importOpportunity && staging.importOpportunity.toUpperCase().includes('REVIEW')) {
      finalAction = 'REVIEW'
      notes.push('Import Opportunity = REVIEW in staging')
    }

    if (companyMatch.action === 'REVIEW') {
      finalAction = 'REVIEW'
      notes.push('Company match ambiguous')
    }

    if (contactMatch.action === 'REVIEW') {
      finalAction = 'REVIEW'
      notes.push('Contact match ambiguous')
    }

    if (opportunityMatch.action === 'REVIEW') {
      finalAction = 'REVIEW'
      notes.push('Opportunity match ambiguous')
    }

    // Priority logic (simple)
    let priority = 'MEDIUM'
    if (staging.importNotes && staging.importNotes.toLowerCase().includes('priorit')) {
      priority = 'HIGH'
    }

    // Build preview row
    const previewRow: PreviewRow = {
      sourceId: staging.id,
      officeSource: staging.office,
      ville: staging.ville,
      companyAction: companyMatch.action,
      companyMatch: companyMatch.match ? `${companyMatch.match.name} (${companyMatch.match.id})` : '-',
      companyMatchReason: companyMatch.reason,
      contact: staging.interlocuteur || '-',
      contactAction: contactMatch.action,
      contactMatch: contactMatch.match ? `${contactMatch.match.firstName} ${contactMatch.match.lastName} (${contactMatch.match.id})` : '-',
      opportunityAction: opportunityMatch.action,
      existingOpportunity: opportunityMatch.match ? `${opportunityMatch.match.name} - ${opportunityMatch.match.stage} (${opportunityMatch.match.id})` : '-',
      owner: lilian.name,
      stage: 'À prospecter',
      sourceCRM: 'Other',
      priority,
      duplicateStatus: staging.duplicateStatus || '-',
      finalAction,
      notes: notes.join('; ') || '-'
    }

    previewRows.push(previewRow)

    // Build JSON row
    previewJSON.push({
      sourceId: staging.id,
      staging,
      company: {
        action: companyMatch.action,
        match: companyMatch.match ? companyMatch.match.id : null,
        reason: companyMatch.reason,
        confidence: companyMatch.confidence
      },
      contact: {
        action: contactMatch.action,
        match: contactMatch.match ? contactMatch.match.id : null,
        reason: contactMatch.reason
      },
      opportunity: {
        action: opportunityMatch.action,
        match: opportunityMatch.match ? opportunityMatch.match.id : null,
        reason: opportunityMatch.reason
      },
      owner: lilian.id,
      stage: 'À prospecter',
      source: 'Other',
      priority,
      finalAction,
      notes: notes.join('; ')
    })

    // Update stats
    stats.company[companyMatch.action.toLowerCase() as keyof typeof stats.company]++
    stats.contact[contactMatch.action.toLowerCase() as keyof typeof stats.contact]++
    stats.opportunity[opportunityMatch.action.toLowerCase() as keyof typeof stats.opportunity]++
    stats.final[finalAction.toLowerCase() as keyof typeof stats.final]++
  }

  console.log(`✅ Processed ${previewRows.length} rows`)
  console.log()

  // 6. CONTACT PARSING CHECK
  console.log('Step 6: CONTACT PARSING CHECK...')
  console.log()
  console.log(`  Interlocuteurs présents: ${contactParsingStats.interlocuteursPresents}`)
  console.log(`  Contacts parsés: ${contactParsingStats.contactsParses}`)
  console.log(`  Contacts CREATE: ${contactParsingStats.contactsCreate}`)
  console.log(`  Contacts REVIEW: ${contactParsingStats.contactsReview}`)
  console.log(`  Contacts SKIP: ${contactParsingStats.contactsSkip}`)
  console.log(`  Contacts avec email direct: ${contactParsingStats.contactsAvecEmailDirect}`)
  console.log(`  Contacts sans email direct: ${contactParsingStats.contactsSansEmailDirect}`)
  console.log()

  // 7. Generate markdown report
  console.log('Step 7: Generating markdown report...')

  let markdown = `# IMPORT PREVIEW NOTAIRES

**Date**: ${new Date().toISOString().split('T')[0]}
**Mission**: READ-ONLY comparison of staging data vs Airtable
**Status**: ✅ PREVIEW COMPLETE — 0 MODIFICATIONS

---

## CONFIGURATION VERIFIED

**Business Line**: KLS3_NOTAIRES
- ID: \`${kls3Notaires.id}\`
- Name: ${kls3Notaires.name}
- Code: ${kls3Notaires.code}
- Category: ${kls3Notaires.category}
- Active: ${kls3Notaires.active}

**Owner**: ${lilian.name}
- ID: \`${lilian.id}\`
- Email: ${lilian.email || 'N/A'}
- Role: ${lilian.role}
- Active: ${lilian.active}

**Default Values**:
- Stage: \`À prospecter\`
- Source: \`Other\`
- Priority: \`MEDIUM\` (HIGH if prioritized in notes)

---

## STATISTICS

### Companies

| Action | Count |
|--------|-------|
| CREATE | ${stats.company.create} |
| EXISTING | ${stats.company.existing} |
| REVIEW | ${stats.company.review} |

### Contacts

| Action | Count |
|--------|-------|
| CREATE | ${stats.contact.create} |
| EXISTING | ${stats.contact.existing} |
| REVIEW | ${stats.contact.review} |
| SKIP | ${stats.contact.skip} |

### Opportunities

| Action | Count |
|--------|-------|
| CREATE | ${stats.opportunity.create} |
| EXISTING | ${stats.opportunity.existing} |
| REVIEW | ${stats.opportunity.review} |

### Final Status

| Status | Count | Percentage |
|--------|-------|------------|
| **READY** | ${stats.final.ready} | ${((stats.final.ready / previewRows.length) * 100).toFixed(1)}% |
| **REVIEW** | ${stats.final.review} | ${((stats.final.review / previewRows.length) * 100).toFixed(1)}% |
| **BLOCKED** | ${stats.final.blocked} | ${((stats.final.blocked / previewRows.length) * 100).toFixed(1)}% |

---

## DETAILED PREVIEW TABLE

`

  // Generate markdown table
  markdown += `\n| Source ID | Office | Ville | Company Action | Company Match | Contact | Contact Action | Opportunity Action | Final Action | Notes |\n`
  markdown += `|-----------|--------|-------|----------------|---------------|---------|----------------|--------------------|--------------|---------|\n`

  for (const row of previewRows) {
    markdown += `| ${row.sourceId} | ${row.officeSource.substring(0, 30)} | ${row.ville} | ${row.companyAction} | ${row.companyMatch.substring(0, 30)} | ${row.contact.substring(0, 20)} | ${row.contactAction} | ${row.opportunityAction} | **${row.finalAction}** | ${row.notes.substring(0, 40)} |\n`
  }

  markdown += `\n---

## BLOCKERS AVANT IMPORT

`

  if (stats.final.blocked > 0) {
    markdown += `⚠️ **${stats.final.blocked} rows BLOCKED**\n\n`
    for (const row of previewRows.filter(r => r.finalAction === 'BLOCKED')) {
      markdown += `- ID ${row.sourceId}: ${row.notes}\n`
    }
  } else {
    markdown += `✅ **No blockers detected**\n`
  }

  markdown += `\n---

## ITEMS REQUIRING REVIEW

`

  if (stats.final.review > 0) {
    markdown += `⚠️ **${stats.final.review} rows require REVIEW**\n\n`

    const reviewRows = previewRows.filter(r => r.finalAction === 'REVIEW')
    for (const row of reviewRows.slice(0, 10)) { // Show first 10
      markdown += `- **ID ${row.sourceId}**: ${row.officeSource} (${row.ville})\n`
      markdown += `  - Company: ${row.companyAction} - ${row.companyMatchReason}\n`
      markdown += `  - Contact: ${row.contactAction}\n`
      markdown += `  - Opportunity: ${row.opportunityAction}\n`
      markdown += `  - Notes: ${row.notes}\n\n`
    }

    if (reviewRows.length > 10) {
      markdown += `\n... and ${reviewRows.length - 10} more REVIEW items (see full table above)\n`
    }
  } else {
    markdown += `✅ **No items requiring review**\n`
  }

  markdown += `\n---

## RECOMMENDATION

`

  if (stats.final.blocked > 0) {
    markdown += `### 🔴 NO-GO

**Reason**: ${stats.final.blocked} blocked row(s) require resolution before import.

**Action Required**:
1. Review blocked items above
2. Resolve blockers in staging sheet or Airtable configuration
3. Re-run preview

`
  } else if (stats.final.review > stats.final.ready) {
    markdown += `### 🟡 GO WITH CAUTION

**Reason**: ${stats.final.review} review items (${((stats.final.review / previewRows.length) * 100).toFixed(1)}% of total)

**Recommendations**:
1. Review ambiguous matches manually
2. Confirm deduplication decisions
3. Validate contact creation logic
4. Proceed with import script development for READY items
5. Handle REVIEW items separately (manual cleanup or case-by-case)

**Ready for**:
- Cleanup preparation
- Import script development (with REVIEW filtering)

`
  } else {
    markdown += `### 🟢 GO FOR CLEANUP PREPARATION

**Reason**: ${stats.final.ready} ready items (${((stats.final.ready / previewRows.length) * 100).toFixed(1)}% of total), ${stats.final.review} review items manageable

**Recommendations**:
1. Review ${stats.final.review} items requiring attention
2. Develop import script for READY items
3. Handle REVIEW items manually or with additional validation
4. Execute cleanup of test data (separate mission)
5. Execute production import

**Note**: "GO FOR CLEANUP PREPARATION" does NOT authorize:
- Automatic deletion of test data
- Execution of import without explicit confirmation
- Any write operations to Airtable at this stage

`
  }

  markdown += `---

## CONFIRMATION — READ-ONLY AUDIT

**Airtable modifications during this preview**:

| Operation | Count |
|-----------|-------|
| Records created | **0** |
| Records modified | **0** |
| Records deleted | **0** |
| Schema changes | **0** |
| Imports executed | **0** |
| Tasks created | **0** |
| Activities created | **0** |
| Value Events created | **0** |

✅ **Mission READ-ONLY strictly respected**

---

## NEXT STEPS

1. **Review this preview** with Product Owner (Eric)
2. **Validate REVIEW items** (especially ID 29 and 45)
3. **Confirm deduplication decisions**
4. **Approve import strategy**
5. **Develop import script** (separate mission)
6. **Execute test data cleanup** (separate mission, explicit approval required)
7. **Execute production import** (explicit approval required)

---

**Generated**: ${new Date().toISOString()}
**Script**: \`scripts/import-preview-notaires.ts\`
**JSON Output**: \`IMPORT_PREVIEW_NOTAIRES.json\`
`

  // Write markdown file
  const markdownPath = resolve(__dirname, '../IMPORT_PREVIEW_NOTAIRES.md')
  writeFileSync(markdownPath, markdown, 'utf-8')
  console.log(`✅ Markdown report written: ${markdownPath}`)

  // Write JSON file
  const jsonPath = resolve(__dirname, '../IMPORT_PREVIEW_NOTAIRES.json')
  writeFileSync(jsonPath, JSON.stringify(previewJSON, null, 2), 'utf-8')
  console.log(`✅ JSON data written: ${jsonPath}`)

  console.log()
  console.log('='.repeat(80))
  console.log('PREVIEW COMPLETE')
  console.log('='.repeat(80))
  console.log()
  console.log('FINAL STATS:')
  console.log(`  READY: ${stats.final.ready}`)
  console.log(`  REVIEW: ${stats.final.review}`)
  console.log(`  BLOCKED: ${stats.final.blocked}`)
  console.log()
  console.log('CONFIRMATION:')
  console.log('  Airtable records created: 0')
  console.log('  Airtable records modified: 0')
  console.log('  Airtable records deleted: 0')
  console.log('  Airtable schema changes: 0')
  console.log('  Imports executed: 0')
  console.log()
}

// Execute
generatePreview()
  .then(() => {
    console.log('✅ Preview generation completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Preview generation failed:', error)
    process.exit(1)
  })
