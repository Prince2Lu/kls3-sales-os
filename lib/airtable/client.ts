// Airtable API client
// Provides server-side data access functions
// NEVER import this in client components

import { config, getTableUrl, getHeaders, TABLE_NAMES } from './config'
import type {
  AirtableRecord,
  AirtableListResponse,
  AirtableBusinessLineFields,
  AirtableCompanyFields,
  AirtableContactFields,
  AirtableOpportunityFields,
  AirtableActivityFields,
  AirtableTaskFields,
  AirtableValueEventFields,
  AirtableGoalFields,
  AirtableStageHistoryFields,
  AirtableUserFields,
} from './types'
import {
  mapBusinessLine,
  mapCompany,
  mapContact,
  mapOpportunity,
  mapActivity,
  mapTask,
  mapValueEvent,
  mapGoal,
  mapStageHistory,
  mapUser,
} from './mappers'

import type {
  BusinessLine,
  Company,
  Contact,
  Opportunity,
  Activity,
  Task,
  ValueEvent,
  Goal,
  StageHistory,
  User,
} from '@/types/domain'

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class AirtableError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AirtableError'
  }
}

async function handleAirtableResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorBody
    let errorDetails: any = {}
    try {
      errorBody = await response.text()
      const parsed = JSON.parse(errorBody)
      errorDetails = parsed.error || parsed
    } catch (e) {
      errorBody = await response.text()
    }

    throw new AirtableError(
      `Airtable API error: ${response.statusText}`,
      response.status,
      errorDetails
    )
  }
  return response.json()
}

// ============================================================================
// GENERIC FETCH FUNCTIONS
// ============================================================================

async function fetchRecords<TFields>(
  tableName: string,
  options?: {
    filterByFormula?: string
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
    maxRecords?: number
  }
): Promise<AirtableRecord<TFields>[]> {
  let allRecords: AirtableRecord<TFields>[] = []
  let offset: string | undefined

  do {
    const url = new URL(getTableUrl(tableName))

    if (options?.filterByFormula) {
      url.searchParams.set('filterByFormula', options.filterByFormula)
    }

    if (options?.sort) {
      options.sort.forEach((sort, index) => {
        url.searchParams.set(`sort[${index}][field]`, sort.field)
        url.searchParams.set(`sort[${index}][direction]`, sort.direction)
      })
    }

    if (options?.maxRecords) {
      url.searchParams.set('maxRecords', options.maxRecords.toString())
    }

    if (offset) {
      url.searchParams.set('offset', offset)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getHeaders(),
    })

    const data =
      await handleAirtableResponse<AirtableListResponse<TFields>>(response)

    allRecords = allRecords.concat(data.records)
    offset = data.offset

    // If maxRecords is specified and we've reached it, stop
    if (options?.maxRecords && allRecords.length >= options.maxRecords) {
      allRecords = allRecords.slice(0, options.maxRecords)
      break
    }
  } while (offset)

  return allRecords
}

async function fetchRecordById<TFields>(
  tableName: string,
  recordId: string
): Promise<AirtableRecord<TFields>> {
  const url = `${getTableUrl(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  return handleAirtableResponse<AirtableRecord<TFields>>(response)
}

// ============================================================================
// BUSINESS_LINES
// ============================================================================

export async function getBusinessLines(): Promise<BusinessLine[]> {
  const records = await fetchRecords<AirtableBusinessLineFields>(
    TABLE_NAMES.BUSINESS_LINES,
    {
      filterByFormula: '{Active} = TRUE()',
    }
  )
  return records.map(mapBusinessLine)
}

export async function getBusinessLineById(id: string): Promise<BusinessLine> {
  const record = await fetchRecordById<AirtableBusinessLineFields>(
    TABLE_NAMES.BUSINESS_LINES,
    id
  )
  return mapBusinessLine(record)
}

export async function getBusinessLineByCode(
  code: string
): Promise<BusinessLine | null> {
  const records = await fetchRecords<AirtableBusinessLineFields>(
    TABLE_NAMES.BUSINESS_LINES,
    {
      filterByFormula: `{Code} = "${code}"`,
      maxRecords: 1,
    }
  )
  return records.length > 0 ? mapBusinessLine(records[0]) : null
}

// ============================================================================
// COMPANIES
// ============================================================================

export async function getCompanies(options?: {
  maxRecords?: number
}): Promise<Company[]> {
  const records = await fetchRecords<AirtableCompanyFields>(
    TABLE_NAMES.COMPANIES,
    {
      sort: [{ field: 'Created At', direction: 'desc' }],
      maxRecords: options?.maxRecords,
    }
  )
  return records.map(mapCompany)
}

export async function getCompanyById(id: string): Promise<Company> {
  const record = await fetchRecordById<AirtableCompanyFields>(
    TABLE_NAMES.COMPANIES,
    id
  )
  return mapCompany(record)
}

// ============================================================================
// CONTACTS
// ============================================================================

export async function getContacts(options?: {
  companyId?: string
  maxRecords?: number
}): Promise<Contact[]> {
  const records = await fetchRecords<AirtableContactFields>(
    TABLE_NAMES.CONTACTS,
    {
      sort: [{ field: 'Created At', direction: 'desc' }],
      maxRecords: options?.maxRecords,
    }
  )

  // Filter in-memory since Airtable formula filtering on linked records is unreliable
  let filteredRecords = records
  if (options?.companyId) {
    const companyId = options.companyId
    filteredRecords = records.filter(record =>
      record.fields.Company?.includes(companyId)
    )
  }

  return filteredRecords.map(mapContact)
}

export async function getContactById(id: string): Promise<Contact> {
  const record = await fetchRecordById<AirtableContactFields>(
    TABLE_NAMES.CONTACTS,
    id
  )
  return mapContact(record)
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================

export async function getOpportunities(options?: {
  businessLineId?: string
  companyId?: string
  owner?: string
  stage?: string
  maxRecords?: number
}): Promise<Opportunity[]> {
  const filters: string[] = []

  // Only use formula filtering for non-linked-record fields
  if (options?.owner) {
    filters.push(`{Owner} = "${options.owner}"`)
  }

  if (options?.stage) {
    filters.push(`{Stage} = "${options.stage}"`)
  }

  const filterByFormula =
    filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

  const records = await fetchRecords<AirtableOpportunityFields>(
    TABLE_NAMES.OPPORTUNITIES,
    {
      filterByFormula,
      sort: [{ field: 'Updated At', direction: 'desc' }],
      maxRecords: options?.maxRecords,
    }
  )

  // Filter linked records in-memory since Airtable formula filtering is unreliable
  let filteredRecords = records

  if (options?.businessLineId) {
    const businessLineId = options.businessLineId
    filteredRecords = filteredRecords.filter(record =>
      record.fields['Business Line']?.includes(businessLineId)
    )
  }

  if (options?.companyId) {
    const companyId = options.companyId
    filteredRecords = filteredRecords.filter(record =>
      record.fields.Company?.includes(companyId)
    )
  }

  return filteredRecords.map(mapOpportunity)
}

export async function getOpportunityById(id: string): Promise<Opportunity> {
  const record = await fetchRecordById<AirtableOpportunityFields>(
    TABLE_NAMES.OPPORTUNITIES,
    id
  )
  return mapOpportunity(record)
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function getActivities(options?: {
  opportunityId?: string
  contactId?: string
  maxRecords?: number
}): Promise<Activity[]> {
  const records = await fetchRecords<AirtableActivityFields>(
    TABLE_NAMES.ACTIVITIES,
    {
      sort: [{ field: 'Date', direction: 'desc' }],
      maxRecords: options?.maxRecords,
    }
  )

  // Filter linked records in-memory since Airtable formula filtering is unreliable
  let filteredRecords = records

  if (options?.opportunityId) {
    const opportunityId = options.opportunityId
    filteredRecords = filteredRecords.filter(record =>
      record.fields.Opportunity?.includes(opportunityId)
    )
  }

  if (options?.contactId) {
    const contactId = options.contactId
    filteredRecords = filteredRecords.filter(record =>
      record.fields.Contact?.includes(contactId)
    )
  }

  return filteredRecords.map(mapActivity)
}

export async function getActivityById(id: string): Promise<Activity> {
  const record = await fetchRecordById<AirtableActivityFields>(
    TABLE_NAMES.ACTIVITIES,
    id
  )
  return mapActivity(record)
}

// ============================================================================
// TASKS
// ============================================================================

export async function getTasks(options?: {
  opportunityId?: string
  contactId?: string
  status?: string
  owner?: string
  maxRecords?: number
}): Promise<Task[]> {
  const filters: string[] = []

  // Only use formula filtering for non-linked-record fields
  if (options?.status) {
    filters.push(`{Status} = "${options.status}"`)
  }

  if (options?.owner) {
    filters.push(`{Owner} = "${options.owner}"`)
  }

  const filterByFormula =
    filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

  const records = await fetchRecords<AirtableTaskFields>(TABLE_NAMES.TASKS, {
    filterByFormula,
    sort: [{ field: 'Due At', direction: 'asc' }],
    maxRecords: options?.maxRecords,
  })

  // Filter linked records in-memory since Airtable formula filtering is unreliable
  let filteredRecords = records

  if (options?.opportunityId) {
    const opportunityId = options.opportunityId
    filteredRecords = filteredRecords.filter(record =>
      record.fields.Opportunity?.includes(opportunityId)
    )
  }

  if (options?.contactId) {
    const contactId = options.contactId
    filteredRecords = filteredRecords.filter(record =>
      record.fields.Contact?.includes(contactId)
    )
  }

  return filteredRecords.map(mapTask)
}

export async function getTaskById(id: string): Promise<Task> {
  const record = await fetchRecordById<AirtableTaskFields>(
    TABLE_NAMES.TASKS,
    id
  )
  return mapTask(record)
}

// ============================================================================
// VALUE_EVENTS
// ============================================================================

export async function getValueEvents(options?: {
  businessLineId?: string
  opportunityId?: string
  status?: string
  maxRecords?: number
}): Promise<ValueEvent[]> {
  const filters: string[] = []

  // Only use formula filtering for non-linked-record fields
  if (options?.status) {
    filters.push(`{Status} = "${options.status}"`)
  }

  const filterByFormula =
    filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

  const records = await fetchRecords<AirtableValueEventFields>(
    TABLE_NAMES.VALUE_EVENTS,
    {
      filterByFormula,
      sort: [{ field: 'Event Date', direction: 'desc' }],
      maxRecords: options?.maxRecords,
    }
  )

  // Filter linked records in-memory since Airtable formula filtering is unreliable
  let filteredRecords = records

  if (options?.businessLineId) {
    const businessLineId = options.businessLineId
    filteredRecords = filteredRecords.filter(record =>
      record.fields['Business Line']?.includes(businessLineId)
    )
  }

  if (options?.opportunityId) {
    const opportunityId = options.opportunityId
    filteredRecords = filteredRecords.filter(record =>
      record.fields.Opportunity?.includes(opportunityId)
    )
  }

  return filteredRecords.map(mapValueEvent)
}

export async function getValueEventById(id: string): Promise<ValueEvent> {
  const record = await fetchRecordById<AirtableValueEventFields>(
    TABLE_NAMES.VALUE_EVENTS,
    id
  )
  return mapValueEvent(record)
}

// ============================================================================
// GOALS
// ============================================================================

export async function getGoals(options?: {
  businessLineId?: string
}): Promise<Goal[]> {
  const records = await fetchRecords<AirtableGoalFields>(TABLE_NAMES.GOALS, {})

  // Filter linked records in-memory since Airtable formula filtering is unreliable
  let filteredRecords = records

  if (options?.businessLineId) {
    const businessLineId = options.businessLineId
    filteredRecords = records.filter(record =>
      record.fields['Business Line']?.includes(businessLineId)
    )
  }

  return filteredRecords.map(mapGoal)
}

export async function getGoalById(id: string): Promise<Goal> {
  const record = await fetchRecordById<AirtableGoalFields>(
    TABLE_NAMES.GOALS,
    id
  )
  return mapGoal(record)
}

// ============================================================================
// STAGE_HISTORY
// ============================================================================

export async function getStageHistory(options?: {
  opportunityId?: string
  maxRecords?: number
}): Promise<StageHistory[]> {
  const records = await fetchRecords<AirtableStageHistoryFields>(
    TABLE_NAMES.STAGE_HISTORY,
    {
      sort: [{ field: 'Changed At', direction: 'desc' }],
      maxRecords: options?.maxRecords,
    }
  )

  // Filter linked records in-memory since Airtable formula filtering is unreliable
  let filteredRecords = records

  if (options?.opportunityId) {
    const opportunityId = options.opportunityId
    filteredRecords = records.filter(record =>
      record.fields.Opportunity?.includes(opportunityId)
    )
  }

  // mapStageHistory returns null for invalid records (missing Opportunity)
  // Filter them out before returning
  return filteredRecords.map(mapStageHistory).filter((sh): sh is StageHistory => sh !== null)
}

export async function getStageHistoryById(id: string): Promise<StageHistory> {
  const record = await fetchRecordById<AirtableStageHistoryFields>(
    TABLE_NAMES.STAGE_HISTORY,
    id
  )
  const mapped = mapStageHistory(record)

  if (!mapped) {
    throw new AirtableError(`STAGE_HISTORY record ${id} is invalid (missing Opportunity link)`, 404)
  }

  return mapped
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

// Helper to create a record
async function createRecord<TFields>(
  tableName: string,
  fields: Partial<TFields>
): Promise<AirtableRecord<TFields>> {
  const url = getTableUrl(tableName)

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fields }),
  })

  const data = await handleAirtableResponse<{ records?: AirtableRecord<TFields>[] }>(response)

  // Airtable returns single record creation differently
  if ('id' in data && 'fields' in data) {
    return data as AirtableRecord<TFields>
  }

  throw new AirtableError('Unexpected response format from Airtable create')
}

// Helper to update a record
async function updateRecord<TFields>(
  tableName: string,
  recordId: string,
  fields: Partial<TFields>
): Promise<AirtableRecord<TFields>> {
  const url = `${getTableUrl(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ fields }),
  })

  return handleAirtableResponse<AirtableRecord<TFields>>(response)
}

// ============================================================================
// COMPANIES - WRITE
// ============================================================================

export interface CreateCompanyInput {
  name: string
  primaryBusinessLineId?: string
  website?: string
  industry?: string
  addressLine1?: string
  addressLine2?: string
  postalCode?: string
  city?: string
  country?: string
  phone?: string
  companySize?: string
  linkedin?: string
  notes?: string
}

export async function createCompany(
  input: CreateCompanyInput
): Promise<Company> {
  const now = new Date().toISOString()

  const blValue = input.primaryBusinessLineId
    ? [input.primaryBusinessLineId]
    : undefined

  const fields: Partial<AirtableCompanyFields> = {
    Name: input.name,
    'Primary Business Line': blValue,
    Website: input.website,
    Industry: input.industry,
    'Address Line 1': input.addressLine1,
    'Address Line 2': input.addressLine2,
    'Postal Code': input.postalCode,
    City: input.city,
    Country: input.country,
    Phone: input.phone,
    'Company Size': input.companySize,
    LinkedIn: input.linkedin,
    Notes: input.notes,
    'Created At': now,
    'Updated At': now,
  }

  const record = await createRecord<AirtableCompanyFields>(
    TABLE_NAMES.COMPANIES,
    fields
  )
  return mapCompany(record)
}

export async function updateCompany(
  id: string,
  input: Partial<CreateCompanyInput>
): Promise<Company> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableCompanyFields> = {
    'Updated At': now,
  }

  if (input.name !== undefined) fields.Name = input.name
  if (input.primaryBusinessLineId !== undefined) {
    const blValue = input.primaryBusinessLineId
      ? [input.primaryBusinessLineId]
      : undefined

    fields['Primary Business Line'] = blValue
  }
  if (input.website !== undefined) fields.Website = input.website
  if (input.industry !== undefined) fields.Industry = input.industry
  if (input.addressLine1 !== undefined) fields['Address Line 1'] = input.addressLine1
  if (input.addressLine2 !== undefined) fields['Address Line 2'] = input.addressLine2
  if (input.postalCode !== undefined) fields['Postal Code'] = input.postalCode
  if (input.city !== undefined) fields.City = input.city
  if (input.country !== undefined) fields.Country = input.country
  if (input.phone !== undefined) fields.Phone = input.phone
  if (input.companySize !== undefined) fields['Company Size'] = input.companySize
  if (input.linkedin !== undefined) fields.LinkedIn = input.linkedin
  if (input.notes !== undefined) fields.Notes = input.notes

  const record = await updateRecord<AirtableCompanyFields>(
    TABLE_NAMES.COMPANIES,
    id,
    fields
  )
  return mapCompany(record)
}

// ============================================================================
// CONTACTS - WRITE
// ============================================================================

export interface CreateContactInput {
  firstName: string
  lastName: string
  companyId?: string
  jobTitle?: string
  email?: string
  phone?: string
  linkedin?: string
  notes?: string
}

export async function createContact(
  input: CreateContactInput
): Promise<Contact> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableContactFields> = {
    'First Name': input.firstName,
    'Last Name': input.lastName,
    Company: input.companyId ? [input.companyId] : undefined,
    'Job Title': input.jobTitle,
    Email: input.email,
    Phone: input.phone,
    LinkedIn: input.linkedin,
    Notes: input.notes,
    'Created At': now,
    'Updated At': now,
  }

  const record = await createRecord<AirtableContactFields>(
    TABLE_NAMES.CONTACTS,
    fields
  )
  return mapContact(record)
}

export async function updateContact(
  id: string,
  input: Partial<CreateContactInput>
): Promise<Contact> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableContactFields> = {
    'Updated At': now,
  }

  if (input.firstName !== undefined) fields['First Name'] = input.firstName
  if (input.lastName !== undefined) fields['Last Name'] = input.lastName
  if (input.companyId !== undefined)
    fields.Company = input.companyId ? [input.companyId] : []
  if (input.jobTitle !== undefined) fields['Job Title'] = input.jobTitle
  if (input.email !== undefined) fields.Email = input.email
  if (input.phone !== undefined) fields.Phone = input.phone
  if (input.linkedin !== undefined) fields.LinkedIn = input.linkedin
  if (input.notes !== undefined) fields.Notes = input.notes

  const record = await updateRecord<AirtableContactFields>(
    TABLE_NAMES.CONTACTS,
    id,
    fields
  )
  return mapContact(record)
}

// ============================================================================
// OPPORTUNITIES - WRITE
// ============================================================================

export interface CreateOpportunityInput {
  name: string
  companyId?: string
  primaryContactId?: string
  businessLineId: string
  owner: string
  stage: string
  source?: string
  priority?: string
  potentialValue?: number
  probability?: number
  expectedCloseDate?: string
  problem?: string
  need?: string
  nextStepNotes?: string
}

export async function createOpportunity(
  input: CreateOpportunityInput
): Promise<Opportunity> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableOpportunityFields> = {
    Name: input.name,
    Company: input.companyId ? [input.companyId] : undefined,
    'Primary Contact': input.primaryContactId
      ? [input.primaryContactId]
      : undefined,
    'Business Line': [input.businessLineId],
    Owner: input.owner,
    Stage: input.stage,
    Source: input.source,
    Priority: input.priority,
    'Potential Value': input.potentialValue,
    Probability: input.probability,
    'Expected Close Date': input.expectedCloseDate,
    Problem: input.problem,
    Need: input.need,
    'Next Step Notes': input.nextStepNotes,
    'Created At': now,
    'Updated At': now,
  }

  const record = await createRecord<AirtableOpportunityFields>(
    TABLE_NAMES.OPPORTUNITIES,
    fields
  )
  return mapOpportunity(record)
}

export async function updateOpportunity(
  id: string,
  input: Partial<CreateOpportunityInput> & {
    wonAt?: string
    lostAt?: string
    lostReason?: string
  }
): Promise<Opportunity> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableOpportunityFields> = {
    'Updated At': now,
  }

  if (input.name !== undefined) fields.Name = input.name
  if (input.companyId !== undefined)
    fields.Company = input.companyId ? [input.companyId] : []
  if (input.primaryContactId !== undefined)
    fields['Primary Contact'] = input.primaryContactId
      ? [input.primaryContactId]
      : []
  if (input.businessLineId !== undefined)
    fields['Business Line'] = [input.businessLineId]
  if (input.owner !== undefined) fields.Owner = input.owner
  if (input.stage !== undefined) fields.Stage = input.stage
  if (input.source !== undefined) fields.Source = input.source
  if (input.priority !== undefined) fields.Priority = input.priority
  if (input.potentialValue !== undefined)
    fields['Potential Value'] = input.potentialValue
  if (input.probability !== undefined) fields.Probability = input.probability
  if (input.expectedCloseDate !== undefined)
    fields['Expected Close Date'] = input.expectedCloseDate
  if (input.problem !== undefined) fields.Problem = input.problem
  if (input.need !== undefined) fields.Need = input.need
  if (input.nextStepNotes !== undefined)
    fields['Next Step Notes'] = input.nextStepNotes
  if (input.wonAt !== undefined) fields['Won At'] = input.wonAt
  if (input.lostAt !== undefined) fields['Lost At'] = input.lostAt
  if (input.lostReason !== undefined) fields['Lost Reason'] = input.lostReason

  const record = await updateRecord<AirtableOpportunityFields>(
    TABLE_NAMES.OPPORTUNITIES,
    id,
    fields
  )
  return mapOpportunity(record)
}

// ============================================================================
// ACTIVITIES - WRITE
// ============================================================================

export interface CreateActivityInput {
  opportunityId?: string
  contactId?: string
  type: string
  date: string
  result?: string
  notes?: string
  owner: string
  durationMinutes?: number
}

export async function createActivity(
  input: CreateActivityInput
): Promise<Activity> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableActivityFields> = {
    Opportunity: input.opportunityId ? [input.opportunityId] : undefined,
    Contact: input.contactId ? [input.contactId] : undefined,
    Type: input.type,
    Date: input.date,
    Result: input.result,
    Notes: input.notes,
    Owner: input.owner,
    'Duration Minutes': input.durationMinutes,
    'Created At': now,
  }

  const record = await createRecord<AirtableActivityFields>(
    TABLE_NAMES.ACTIVITIES,
    fields
  )
  return mapActivity(record)
}

export async function updateActivity(
  id: string,
  input: Partial<CreateActivityInput>
): Promise<Activity> {
  const fields: Partial<AirtableActivityFields> = {}

  if (input.opportunityId !== undefined)
    fields.Opportunity = input.opportunityId ? [input.opportunityId] : []
  if (input.contactId !== undefined)
    fields.Contact = input.contactId ? [input.contactId] : []
  if (input.type !== undefined) fields.Type = input.type
  if (input.date !== undefined) fields.Date = input.date
  if (input.result !== undefined) fields.Result = input.result
  if (input.notes !== undefined) fields.Notes = input.notes
  if (input.owner !== undefined) fields.Owner = input.owner
  if (input.durationMinutes !== undefined)
    fields['Duration Minutes'] = input.durationMinutes

  const record = await updateRecord<AirtableActivityFields>(
    TABLE_NAMES.ACTIVITIES,
    id,
    fields
  )
  return mapActivity(record)
}

// ============================================================================
// TASKS - WRITE
// ============================================================================

export interface CreateTaskInput {
  opportunityId?: string
  contactId?: string
  type: string
  dueAt?: string
  priority?: string
  status: string
  notes?: string
  owner: string
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableTaskFields> = {
    Opportunity: input.opportunityId ? [input.opportunityId] : undefined,
    Contact: input.contactId ? [input.contactId] : undefined,
    Type: input.type,
    'Due At': input.dueAt,
    Priority: input.priority,
    Status: input.status,
    Notes: input.notes,
    Owner: input.owner,
    'Created At': now,
  }

  const record = await createRecord<AirtableTaskFields>(
    TABLE_NAMES.TASKS,
    fields
  )
  return mapTask(record)
}

export async function updateTask(
  id: string,
  input: Partial<CreateTaskInput> & { completedAt?: string }
): Promise<Task> {
  const fields: Partial<AirtableTaskFields> = {}

  if (input.opportunityId !== undefined)
    fields.Opportunity = input.opportunityId ? [input.opportunityId] : []
  if (input.contactId !== undefined)
    fields.Contact = input.contactId ? [input.contactId] : []
  if (input.type !== undefined) fields.Type = input.type
  if (input.dueAt !== undefined) fields['Due At'] = input.dueAt
  if (input.priority !== undefined) fields.Priority = input.priority
  if (input.status !== undefined) fields.Status = input.status
  if (input.notes !== undefined) fields.Notes = input.notes
  if (input.owner !== undefined) fields.Owner = input.owner
  if (input.completedAt !== undefined)
    fields['Completed At'] = input.completedAt

  const record = await updateRecord<AirtableTaskFields>(
    TABLE_NAMES.TASKS,
    id,
    fields
  )
  return mapTask(record)
}

// ============================================================================
// VALUE_EVENTS - WRITE
// ============================================================================

export interface CreateValueEventInput {
  opportunityId?: string
  contactId?: string
  businessLineId: string
  eventType: string
  eventDate: string
  amount: number
  revenueType: string
  status: string
  notes?: string
}

export async function createValueEvent(
  input: CreateValueEventInput
): Promise<ValueEvent> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableValueEventFields> = {
    Opportunity: input.opportunityId ? [input.opportunityId] : undefined,
    Contact: input.contactId ? [input.contactId] : undefined,
    'Business Line': [input.businessLineId],
    'Event Type': input.eventType,
    'Event Date': input.eventDate,
    Amount: input.amount,
    'Revenue Type': input.revenueType,
    Status: input.status,
    Notes: input.notes,
    'Created At': now,
  }

  const record = await createRecord<AirtableValueEventFields>(
    TABLE_NAMES.VALUE_EVENTS,
    fields
  )
  return mapValueEvent(record)
}

export async function updateValueEvent(
  id: string,
  input: Partial<CreateValueEventInput>
): Promise<ValueEvent> {
  const fields: Partial<AirtableValueEventFields> = {}

  if (input.opportunityId !== undefined)
    fields.Opportunity = input.opportunityId ? [input.opportunityId] : []
  if (input.contactId !== undefined)
    fields.Contact = input.contactId ? [input.contactId] : []
  if (input.businessLineId !== undefined)
    fields['Business Line'] = [input.businessLineId]
  if (input.eventType !== undefined) fields['Event Type'] = input.eventType
  if (input.eventDate !== undefined) fields['Event Date'] = input.eventDate
  if (input.amount !== undefined) fields.Amount = input.amount
  if (input.revenueType !== undefined)
    fields['Revenue Type'] = input.revenueType
  if (input.status !== undefined) fields.Status = input.status
  if (input.notes !== undefined) fields.Notes = input.notes

  const record = await updateRecord<AirtableValueEventFields>(
    TABLE_NAMES.VALUE_EVENTS,
    id,
    fields
  )
  return mapValueEvent(record)
}

// ============================================================================
// STAGE_HISTORY - WRITE
// ============================================================================

export interface CreateStageHistoryInput {
  opportunityId: string
  fromStage?: string
  toStage: string
  changedBy: string
}

export async function createStageHistory(
  input: CreateStageHistoryInput
): Promise<StageHistory> {
  const now = new Date().toISOString()

  const fields: Partial<AirtableStageHistoryFields> = {
    Opportunity: [input.opportunityId],
    'From Stage': input.fromStage,
    'To Stage': input.toStage,
    'Changed At': now,
    'Changed By': input.changedBy,
  }

  const record = await createRecord<AirtableStageHistoryFields>(
    TABLE_NAMES.STAGE_HISTORY,
    fields
  )
  const mapped = mapStageHistory(record)

  // This should never happen since we always create with Opportunity
  // but TypeScript requires handling the null case
  if (!mapped) {
    throw new AirtableError('Failed to create STAGE_HISTORY: created record is invalid', 500)
  }

  return mapped
}

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

// Helper to delete a record
async function deleteRecord(tableName: string, recordId: string): Promise<void> {
  const url = `${getTableUrl(tableName)}/${recordId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(),
  })

  await handleAirtableResponse<{ deleted: boolean; id: string }>(response)
}

export async function deleteCompany(id: string): Promise<void> {
  await deleteRecord(TABLE_NAMES.COMPANIES, id)
}

export async function deleteContact(id: string): Promise<void> {
  await deleteRecord(TABLE_NAMES.CONTACTS, id)
}

export async function deleteOpportunity(id: string): Promise<void> {
  await deleteRecord(TABLE_NAMES.OPPORTUNITIES, id)
}

export async function deleteActivity(id: string): Promise<void> {
  await deleteRecord(TABLE_NAMES.ACTIVITIES, id)
}

export async function deleteTask(id: string): Promise<void> {
  await deleteRecord(TABLE_NAMES.TASKS, id)
}

export async function deleteValueEvent(id: string): Promise<void> {
  await deleteRecord(TABLE_NAMES.VALUE_EVENTS, id)
}

export async function deleteStageHistory(id: string): Promise<void> {
  await deleteRecord(TABLE_NAMES.STAGE_HISTORY, id)
}

// ============================================================================
// USERS (Phase 8: Airtable-based Authentication)
// ============================================================================

/**
 * Get user by email (for authentication)
 * Email is normalized (trimmed, lowercase) before query
 * Returns null if user not found
 * Server-side only - NEVER expose password hash to client
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  // Normalize email exactly as auth flow does
  const normalizedEmail = email.trim().toLowerCase()

  const records = await fetchRecords<AirtableUserFields>(TABLE_NAMES.USERS, {
    // Use exact email match in formula
    filterByFormula: `LOWER(TRIM({Email})) = "${normalizedEmail}"`,
    maxRecords: 1,
  })

  if (records.length === 0) {
    return null
  }

  return mapUser(records[0])
}

/**
 * Get all users
 * Server-side only - used for admin/preview operations
 */
export async function getUsers(options?: {
  maxRecords?: number
}): Promise<User[]> {
  const records = await fetchRecords<AirtableUserFields>(TABLE_NAMES.USERS, {
    maxRecords: options?.maxRecords,
  })

  return records.map(mapUser)
}
