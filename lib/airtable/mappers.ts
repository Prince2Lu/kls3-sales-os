// Mappers to convert between Airtable records and domain types
// These handle the transformation from Airtable's field naming to our clean domain model

import type {
  AirtableRecord,
  AirtableBusinessLineFields,
  AirtableCompanyFields,
  AirtableContactFields,
  AirtableOpportunityFields,
  AirtableActivityFields,
  AirtableTaskFields,
  AirtableValueEventFields,
  AirtableGoalFields,
  AirtableStageHistoryFields,
} from './types'

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
  BusinessLineCode,
  Category,
  EventType,
  RevenueType,
  Stage,
  Priority,
  Source,
  Owner,
  ActivityType,
  ActivityResult,
  TaskType,
  TaskStatus,
  ValueEventStatus,
} from '@/types/domain'

// ============================================================================
// BUSINESS_LINES
// ============================================================================

export function mapBusinessLine(
  record: AirtableRecord<AirtableBusinessLineFields>
): BusinessLine {
  const fields = record.fields
  return {
    id: record.id,
    name: fields.Name,
    code: fields.Code as BusinessLineCode,
    category: fields.Category as Category,
    revenueTrigger: fields['Revenue Trigger'] as EventType,
    revenueType: fields['Revenue Type'] as RevenueType,
    defaultUnitValue: fields['Default Unit Value'] ?? null,
    active: fields.Active,
  }
}

// ============================================================================
// COMPANIES
// ============================================================================

export function mapCompany(
  record: AirtableRecord<AirtableCompanyFields>
): Company {
  const fields = record.fields
  return {
    id: record.id,
    name: fields.Name,
    website: fields.Website ?? null,
    industry: fields.Industry ?? null,
    city: fields.City ?? null,
    country: fields.Country ?? null,
    phone: fields.Phone ?? null,
    companySize: fields['Company Size'] ?? null,
    linkedin: fields.LinkedIn ?? null,
    notes: fields.Notes ?? null,
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  }
}

// ============================================================================
// CONTACTS
// ============================================================================

export function mapContact(
  record: AirtableRecord<AirtableContactFields>
): Contact {
  const fields = record.fields
  return {
    id: record.id,
    firstName: fields['First Name'],
    lastName: fields['Last Name'],
    companyId: fields.Company?.[0] ?? null,
    jobTitle: fields['Job Title'] ?? null,
    email: fields.Email ?? null,
    phone: fields.Phone ?? null,
    linkedin: fields.LinkedIn ?? null,
    notes: fields.Notes ?? null,
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  }
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================

export function mapOpportunity(
  record: AirtableRecord<AirtableOpportunityFields>
): Opportunity {
  const fields = record.fields
  return {
    id: record.id,
    name: fields.Name,
    companyId: fields.Company?.[0] ?? null,
    primaryContactId: fields['Primary Contact']?.[0] ?? null,
    businessLineId: fields['Business Line'][0],
    owner: fields.Owner as Owner,
    stage: fields.Stage as Stage,
    source: (fields.Source as Source) ?? null,
    priority: (fields.Priority as Priority) ?? null,
    potentialValue: fields['Potential Value'] ?? null,
    probability: fields.Probability ?? null,
    expectedCloseDate: fields['Expected Close Date'] ?? null,
    problem: fields.Problem ?? null,
    need: fields.Need ?? null,
    nextStepNotes: fields['Next Step Notes'] ?? null,
    lostReason: fields['Lost Reason'] ?? null,
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
    wonAt: fields['Won At'] ?? null,
    lostAt: fields['Lost At'] ?? null,
  }
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export function mapActivity(
  record: AirtableRecord<AirtableActivityFields>
): Activity {
  const fields = record.fields
  return {
    id: record.id,
    opportunityId: fields.Opportunity?.[0] ?? null,
    contactId: fields.Contact?.[0] ?? null,
    type: fields.Type as ActivityType,
    date: fields.Date,
    result: (fields.Result as ActivityResult) ?? null,
    notes: fields.Notes ?? null,
    owner: fields.Owner as Owner,
    durationMinutes: fields['Duration Minutes'] ?? null,
    createdAt: fields['Created At'],
  }
}

// ============================================================================
// TASKS
// ============================================================================

export function mapTask(record: AirtableRecord<AirtableTaskFields>): Task {
  const fields = record.fields
  return {
    id: record.id,
    opportunityId: fields.Opportunity?.[0] ?? null,
    contactId: fields.Contact?.[0] ?? null,
    type: fields.Type as TaskType,
    dueAt: fields['Due At'] ?? null,
    priority: (fields.Priority as Priority) ?? null,
    status: fields.Status as TaskStatus,
    notes: fields.Notes ?? null,
    owner: fields.Owner as Owner,
    createdAt: fields['Created At'],
    completedAt: fields['Completed At'] ?? null,
  }
}

// ============================================================================
// VALUE_EVENTS
// ============================================================================

export function mapValueEvent(
  record: AirtableRecord<AirtableValueEventFields>
): ValueEvent {
  const fields = record.fields
  return {
    id: record.id,
    opportunityId: fields.Opportunity?.[0] ?? null,
    contactId: fields.Contact?.[0] ?? null,
    businessLineId: fields['Business Line'][0],
    eventType: fields['Event Type'] as EventType,
    eventDate: fields['Event Date'],
    amount: fields.Amount,
    revenueType: fields['Revenue Type'] as RevenueType,
    status: fields.Status as ValueEventStatus,
    notes: fields.Notes ?? null,
    createdAt: fields['Created At'],
  }
}

// ============================================================================
// GOALS
// ============================================================================

export function mapGoal(record: AirtableRecord<AirtableGoalFields>): Goal {
  const fields = record.fields
  return {
    id: record.id,
    businessLineId: fields['Business Line'][0],
    metric: fields.Metric,
    period: fields.Period,
    target: fields.Target,
    ambitiousTarget: fields['Ambitious Target'] ?? null,
    startDate: fields['Start Date'] ?? null,
    endDate: fields['End Date'] ?? null,
  }
}

// ============================================================================
// STAGE_HISTORY
// ============================================================================

export function mapStageHistory(
  record: AirtableRecord<AirtableStageHistoryFields>
): StageHistory {
  const fields = record.fields
  return {
    id: record.id,
    opportunityId: fields.Opportunity[0],
    fromStage: (fields['From Stage'] as Stage) ?? null,
    toStage: fields['To Stage'] as Stage,
    changedAt: fields['Changed At'],
    changedBy: fields['Changed By'] as Owner,
  }
}
