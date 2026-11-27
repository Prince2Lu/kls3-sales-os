// "Sales OS friendly" CSV import planner (Trello #58).
// Pure: reads the CSV rows and the existing CRM data, decides row by row what
// would be created or matched, and never writes. The server action re-plans
// on the server before writing, so the browser's preview is never trusted.
//
// Rules: Company / Contact / Prospecting target stay linked (no isolated copy),
// existing records are never modified, no Opportunity is ever created.

import type { ColdCallTarget, Company, Contact } from '@/types/domain'

/** Keeps one import inside a single server request (Airtable allows ~5 writes/s). */
export const IMPORT_MAX_ROWS = 100

/** Column order of the downloadable template. */
export const TEMPLATE_HEADERS = [
  'Entreprise', 'SIREN', 'Site web', 'Téléphone entreprise', 'Email entreprise', 'Adresse', 'Code postal', 'Ville', 'Pays',
  'Secteur', 'Taille', 'Prénom', 'Nom', 'Fonction', 'Email', 'Téléphone', 'Mobile', 'LinkedIn', 'Notes',
] as const

type Field =
  | 'companyName' | 'siren' | 'website' | 'companyPhone' | 'companyEmail' | 'address' | 'postalCode' | 'city' | 'country'
  | 'industry' | 'companySize' | 'firstName' | 'lastName' | 'jobTitle' | 'email' | 'phone' | 'mobile' | 'linkedin' | 'notes'

const ALIASES: Record<Field, string[]> = {
  companyName: ['entreprise', 'societe', 'company', 'raison sociale', 'nom entreprise', 'organisation', 'cabinet', 'office'],
  siren: ['siren', 'siret', 'numero siren'],
  website: ['site web', 'site', 'website', 'url', 'domaine'],
  companyPhone: ['telephone entreprise', 'standard', 'company phone', 'tel entreprise'],
  companyEmail: ['email entreprise', 'email generique', 'company email', 'mail entreprise'],
  address: ['adresse', 'address', 'adresse 1'],
  postalCode: ['code postal', 'cp', 'postal code', 'zip'],
  city: ['ville', 'city', 'commune'],
  country: ['pays', 'country'],
  industry: ['secteur', 'secteur d activite', 'industrie', 'industry', 'activite'],
  companySize: ['taille', 'effectif', 'company size'],
  firstName: ['prenom', 'first name', 'firstname'],
  lastName: ['nom', 'nom de famille', 'last name', 'lastname'],
  jobTitle: ['fonction', 'poste', 'titre', 'job title'],
  email: ['email', 'e mail', 'mail', 'email contact', 'courriel'],
  phone: ['telephone', 'tel', 'telephone pro', 'telephone professionnel', 'phone', 'ligne directe'],
  mobile: ['mobile', 'portable', 'telephone portable', 'telephone perso', 'telephone personnel'],
  linkedin: ['linkedin', 'profil linkedin'],
  notes: ['notes', 'note', 'commentaire', 'commentaires'],
}

const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.fr', 'live.com',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'icloud.com', 'me.com', 'gmx.fr', 'aol.com',
  'protonmail.com', 'proton.me', 'bbox.fr', 'neuf.fr',
])

export function headerKey(header: string): string {
  return header.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Maps the file's headers to Sales OS fields. Unknown columns are reported, not guessed. */
export function mapHeaders(headers: string[]): { columns: Partial<Record<Field, string>>; unknown: string[] } {
  const columns: Partial<Record<Field, string>> = {}
  const unknown: string[] = []
  for (const header of headers) {
    const key = headerKey(header)
    const field = (Object.keys(ALIASES) as Field[]).find((candidate) => ALIASES[candidate].includes(key))
    if (field && !columns[field]) columns[field] = header
    else if (!field && header) unknown.push(header)
  }
  return { columns, unknown }
}

export function normalizeName(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Last 9 digits: "+33 1 23 45 67 89" and "01.23.45.67.89" match. */
export function phoneKey(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : ''
}

export function sirenKey(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits.length === 9 || digits.length === 14 ? digits.slice(0, 9) : ''
}

export function websiteDomain(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).hostname.replace(/^www\./, '').toLowerCase()
  } catch { return '' }
}

export function businessEmailDomain(email: string | null | undefined): string {
  const domain = (email ?? '').toLowerCase().split('@')[1] ?? ''
  return domain && !FREE_MAIL_DOMAINS.has(domain) ? domain : ''
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export interface ImportRowData {
  companyName: string
  registryNumber: string
  website: string
  companyPhone: string
  companyEmail: string
  address: string
  postalCode: string
  city: string
  country: string
  industry: string
  companySize: string
  firstName: string
  lastName: string
  jobTitle: string
  email: string
  phone: string
  linkedin: string
  notes: string
}

export type MatchState = 'CREATE' | 'EXISTING' | 'IN_FILE' | 'NONE'

export interface PlannedRow {
  line: number
  data: ImportRowData
  company: { state: MatchState; id: string | null; matchedBy: string | null; key: string }
  contact: { state: MatchState; id: string | null; matchedBy: string | null; key: string }
  target: 'CREATE' | 'EXISTING' | 'NONE'
  errors: string[]
  warnings: string[]
}

export interface ImportPlan {
  rows: PlannedRow[]
  unknownColumns: string[]
  missingColumns: string[]
  summary: {
    rows: number
    rejected: number
    companiesToCreate: number
    companiesExisting: number
    contactsToCreate: number
    contactsExisting: number
    targetsToCreate: number
    targetsExisting: number
  }
}

function readRow(raw: Record<string, string>, columns: Partial<Record<Field, string>>): { data: ImportRowData; warnings: string[] } {
  const get = (field: Field) => (columns[field] ? raw[columns[field]!] ?? '' : '').trim()
  const warnings: string[] = []
  let email = get('email').toLowerCase()
  if (email && !validEmail(email)) { warnings.push(`Email ignoré (format invalide) : ${email}`); email = '' }
  let companyEmail = get('companyEmail').toLowerCase()
  if (companyEmail && !validEmail(companyEmail)) { warnings.push(`Email entreprise ignoré (format invalide) : ${companyEmail}`); companyEmail = '' }

  // Sales OS has one phone per contact: the professional line wins, the mobile
  // is kept in the notes so nothing is lost (Trello #28 would add a field).
  const phone = get('phone')
  const mobile = get('mobile')
  const notes = [get('notes'), phone && mobile && phoneKey(phone) !== phoneKey(mobile) ? `Mobile : ${mobile}` : '']
    .filter(Boolean).join('\n')

  return {
    data: {
      companyName: get('companyName'),
      registryNumber: get('siren').replace(/\s/g, ''),
      website: get('website'),
      companyPhone: get('companyPhone'),
      companyEmail,
      address: get('address'),
      postalCode: get('postalCode'),
      city: get('city'),
      country: get('country'),
      industry: get('industry'),
      companySize: get('companySize'),
      firstName: get('firstName'),
      lastName: get('lastName'),
      jobTitle: get('jobTitle'),
      email,
      phone: phone || mobile,
      linkedin: get('linkedin'),
      notes,
    },
    warnings,
  }
}

function companyKeys(data: Pick<ImportRowData, 'companyName' | 'registryNumber' | 'website' | 'companyPhone' | 'companyEmail' | 'postalCode'>) {
  return {
    siren: sirenKey(data.registryNumber),
    domain: websiteDomain(data.website) || businessEmailDomain(data.companyEmail),
    namePostal: data.postalCode ? `${normalizeName(data.companyName)}|${data.postalCode.replace(/\s/g, '')}` : '',
    phone: phoneKey(data.companyPhone),
    name: normalizeName(data.companyName),
  }
}

function existingCompanyKeys(company: Company) {
  return companyKeys({
    companyName: company.name,
    registryNumber: company.registryNumber ?? '',
    website: company.website ?? '',
    companyPhone: company.phone ?? '',
    companyEmail: company.email ?? '',
    postalCode: company.postalCode ?? '',
  })
}

type CompanyRef = { id: string | null; key: string; keys: ReturnType<typeof companyKeys> }

function findCompany(keys: ReturnType<typeof companyKeys>, candidates: CompanyRef[]): { ref: CompanyRef; matchedBy: string } | null {
  const rules: Array<[keyof typeof keys, string]> = [['siren', 'SIREN'], ['domain', 'domaine'], ['namePostal', 'nom + code postal'], ['phone', 'téléphone']]
  for (const [field, label] of rules) {
    if (!keys[field]) continue
    const ref = candidates.find((candidate) => candidate.keys[field] === keys[field])
    if (ref) return { ref, matchedBy: label }
  }
  if (keys.name) {
    const sameName = candidates.filter((candidate) => candidate.keys.name === keys.name)
    if (sameName.length === 1) return { ref: sameName[0], matchedBy: 'nom seul' }
  }
  return null
}

export function planImport(input: {
  rows: Record<string, string>[]
  headers: string[]
  companies: Company[]
  contacts: Contact[]
  targets: ColdCallTarget[]
  businessLineId: string
  createTargets: boolean
}): ImportPlan {
  const { columns, unknown } = mapHeaders(input.headers)
  const missingColumns = columns.companyName ? [] : ['Entreprise']

  const existingCompanies: CompanyRef[] = input.companies.map((company) => ({ id: company.id, key: company.id, keys: existingCompanyKeys(company) }))
  const fileCompanies: CompanyRef[] = []
  const companyById = new Map(input.companies.map((company) => [company.id, company]))
  const fileContacts: Array<{ key: string; companyKey: string; email: string; phone: string; name: string }> = []
  const rowsSoFar: PlannedRow[] = []

  const rows: PlannedRow[] = input.rows.map((raw, index) => {
    const line = index + 2 // header is line 1
    const { data, warnings } = readRow(raw, columns)
    const errors: string[] = []
    if (!data.companyName) errors.push('Nom d’entreprise manquant')
    if (index >= IMPORT_MAX_ROWS) errors.push(`Au-delà de ${IMPORT_MAX_ROWS} lignes : à importer dans un autre lot`)

    const emptyRef = { state: 'NONE' as MatchState, id: null, matchedBy: null, key: '' }
    if (errors.length) return { line, data, company: emptyRef, contact: emptyRef, target: 'NONE', errors, warnings }

    // Company: existing CRM first, then an earlier row of the same file.
    const keys = companyKeys(data)
    let company: PlannedRow['company']
    const existing = findCompany(keys, existingCompanies)
    if (existing) {
      company = { state: 'EXISTING', id: existing.ref.id, matchedBy: existing.matchedBy, key: existing.ref.key }
      if (existing.matchedBy === 'nom seul') warnings.push('Entreprise rapprochée sur le nom seul : vérifier')
    } else {
      const inFile = findCompany(keys, fileCompanies)
      if (inFile) company = { state: 'IN_FILE', id: null, matchedBy: inFile.matchedBy, key: inFile.ref.key }
      else {
        const key = `row:${line}`
        fileCompanies.push({ id: null, key, keys })
        company = { state: 'CREATE', id: null, matchedBy: null, key }
      }
    }

    // Contact: email, then phone or name inside the same company.
    let contact: PlannedRow['contact'] = emptyRef
    let contactElsewhere = false
    const hasPerson = !!(data.lastName || data.firstName)
    if (hasPerson || data.email) {
      const companyEmail = company.id ? companyById.get(company.id)?.email?.toLowerCase() ?? '' : data.companyEmail
      const personalEmail = data.email && data.email !== companyEmail ? data.email : ''
      const phone = phoneKey(data.phone)
      const name = normalizeName(`${data.firstName}${data.lastName}`)
      const sameCompany = (contactCompanyId: string | null) => !!company.id && contactCompanyId === company.id

      const byEmail = personalEmail ? input.contacts.find((item) => item.email?.toLowerCase() === personalEmail) : undefined
      const byPhone = !byEmail && phone ? input.contacts.find((item) => sameCompany(item.companyId) && phoneKey(item.phone) === phone) : undefined
      const byName = !byEmail && !byPhone && name ? input.contacts.find((item) => sameCompany(item.companyId) && normalizeName(`${item.firstName}${item.lastName}`) === name) : undefined
      const found = byEmail ?? byPhone ?? byName
      if (found) {
        contact = { state: 'EXISTING', id: found.id, matchedBy: byEmail ? 'email' : byPhone ? 'téléphone' : 'nom dans la même entreprise', key: found.id }
        contactElsewhere = !company.id || found.companyId !== company.id
        if (contactElsewhere) warnings.push('Contact déjà rattaché à une autre entreprise : non modifié, aucune cible créée')
      } else {
        const twin = fileContacts.find((item) => (personalEmail && item.email === personalEmail) ||
          (item.companyKey === company.key && ((phone && item.phone === phone) || (name && item.name === name))))
        if (twin) contact = { state: 'IN_FILE', id: null, matchedBy: 'ligne précédente du fichier', key: twin.key }
        else if (!hasPerson) warnings.push('Email sans nom de contact : seule l’entreprise est importée')
        else {
          const key = `row:${line}`
          fileContacts.push({ key, companyKey: company.key, email: personalEmail, phone, name })
          contact = { state: 'CREATE', id: null, matchedBy: null, key }
        }
      }
    }

    // Prospecting target: Company + Business Line + Contact is unique.
    let target: PlannedRow['target'] = 'NONE'
    if (input.createTargets && !contactElsewhere) {
      // undefined = contact created by this import, so no target can exist yet
      const contactId = contact.state === 'EXISTING' ? contact.id : contact.state === 'NONE' ? null : undefined
      const exists = !!company.id && contactId !== undefined && input.targets.some((item) => !item.archived &&
        item.companyId === company.id && item.businessLineId === input.businessLineId && (item.contactId ?? null) === contactId)
      const duplicateInFile = (company.state === 'IN_FILE' || contact.state === 'IN_FILE') &&
        rowsSoFar.some((row) => row.target !== 'NONE' && row.company.key === company.key && (row.contact.key || null) === (contact.key || null))
      target = exists || duplicateInFile ? 'EXISTING' : 'CREATE'
    }

    const planned: PlannedRow = { line, data, company, contact, target, errors, warnings }
    rowsSoFar.push(planned)
    return planned
  })

  const valid = rows.filter((row) => !row.errors.length)
  return {
    rows,
    unknownColumns: unknown,
    missingColumns,
    summary: {
      rows: rows.length,
      rejected: rows.length - valid.length,
      companiesToCreate: valid.filter((row) => row.company.state === 'CREATE').length,
      companiesExisting: valid.filter((row) => row.company.state === 'EXISTING').length,
      contactsToCreate: valid.filter((row) => row.contact.state === 'CREATE').length,
      contactsExisting: valid.filter((row) => row.contact.state === 'EXISTING').length,
      targetsToCreate: valid.filter((row) => row.target === 'CREATE').length,
      targetsExisting: valid.filter((row) => row.target === 'EXISTING').length,
    },
  }
}
