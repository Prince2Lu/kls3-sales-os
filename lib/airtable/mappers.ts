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
  AirtableUserFields,
  AirtableColdCallTargetFields,
  AirtableCallStatusHistoryFields,
  AirtableRelationshipFields,
  AirtableImportBatchFields,
  AirtableEmailSuppressionFields,
  AirtableEmailCampaignFields,
  AirtableEmailRecipientFields,
  AirtableEmailEventFields,
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
  User,
  ColdCallTarget,
  CallStatusHistory,
  Relationship,
  BusinessLineCode,
  Category,
  EventType,
  RevenueType,
  ProspectingMode,
  Stage,
  Priority,
  Source,
  Owner,
  ActivityType,
  ActivityResult,
  TaskType,
  TaskStatus,
  ValueEventStatus,
  UserRole,
  CallStatus,
  RelationshipType,
  RelationshipStatus,
  RelationshipImportance,
  ImportBatch,
  ImportBatchStatus,
  EmailSuppression,
  EmailSuppressionReason,
  EmailCampaign,
  EmailRecipient,
  EmailEvent,
  EmailCampaignStatus,
  EmailRecipientStatus,
} from '@/types/domain'


// ============================================================================
// BUSINESS_LINES
// ============================================================================

export function mapBusinessLine(
  record: AirtableRecord<AirtableBusinessLineFields>
): BusinessLine {
  const fields = record.fields

  // Fallback: If Prospecting Mode is not set, default to DIRECT_OPPORTUNITY (safe default)
  const prospectingMode = (fields['Prospecting Mode'] as ProspectingMode | undefined) ?? 'DIRECT_OPPORTUNITY'

  return {
    id: record.id,
    name: fields.Name,
    code: fields.Code as BusinessLineCode,
    category: fields.Category as Category,
    revenueTrigger: fields['Revenue Trigger'] as EventType,
    revenueType: fields['Revenue Type'] as RevenueType,
    defaultUnitValue: fields['Default Unit Value'] ?? null,
    active: fields.Active,
    prospectingMode,
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
    primaryBusinessLineId: fields['Primary Business Line']?.[0] ?? null,
    website: fields.Website ?? null,
    industry: fields.Industry ?? null,
    addressLine1: fields['Address Line 1'] ?? null,
    addressLine2: fields['Address Line 2'] ?? null,
    postalCode: fields['Postal Code'] ?? null,
    city: fields.City ?? null,
    country: fields.Country ?? null,
    phone: fields.Phone ?? null,
    email: fields.Email ?? null,
    notaryCount: fields['Notary Count'] ?? null,
    importBatchId: fields['Import Batch']?.[0] ?? null,
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
    businessLineIds: fields['Business Lines'] ?? [],
    jobTitle: fields['Job Title'] ?? null,
    email: fields.Email ?? null,
    phone: fields.Phone ?? null,
    decisionMaker: fields['Decision Maker'] ?? false,
    linkedin: fields.LinkedIn ?? null,
    notes: fields.Notes ?? null,
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  }
}

export function mapImportBatch(record: AirtableRecord<AirtableImportBatchFields>): ImportBatch {
  const fields = record.fields
  return {
    id: record.id,
    name: fields.Name,
    source: fields.Source ?? null,
    criteria: fields.Criteria ?? null,
    requestedCount: fields['Requested Count'] ?? 0,
    companiesCreated: fields['Companies Created'] ?? 0,
    companiesUpdated: fields['Companies Updated'] ?? 0,
    contactsCreated: fields['Contacts Created'] ?? 0,
    duplicatesSkipped: fields['Duplicates Skipped'] ?? 0,
    excluded: fields.Excluded ?? 0,
    errors: fields.Errors ?? 0,
    importedBy: fields['Imported By'] as Owner,
    status: fields.Status as ImportBatchStatus,
    importedAt: fields['Imported At'] ?? null,
    createdAt: fields['Created At'],
  }
}

export function mapEmailSuppression(record: AirtableRecord<AirtableEmailSuppressionFields>): EmailSuppression {
  const fields = record.fields
  return {
    id: record.id,
    email: fields.Email,
    companyId: fields.Company?.[0] ?? null,
    contactId: fields.Contact?.[0] ?? null,
    scope: fields.Scope as EmailSuppression['scope'],
    reason: fields.Reason as EmailSuppressionReason,
    source: fields.Source as EmailSuppression['source'],
    active: fields.Active,
    details: fields.Details ?? null,
    createdAt: fields['Created At'],
  }
}

export function mapEmailCampaign(record: AirtableRecord<AirtableEmailCampaignFields>): EmailCampaign {
  const fields = record.fields
  return { id: record.id, name: fields.Name, businessLineId: fields['Business Line'][0], brevoCampaignId: fields['Brevo Campaign ID'] ?? null,
    status: fields.Status as EmailCampaignStatus, subject: fields.Subject, templateId: fields['Template ID'] ?? null,
    senderName: fields['Sender Name'], senderEmail: fields['Sender Email'], replyTo: fields['Reply To'] ?? null,
    recipientCount: fields['Recipient Count'] ?? 0, createdBy: fields['Created By'] as Owner, createdAt: fields['Created At'], sentAt: fields['Sent At'] ?? null }
}

export function mapEmailRecipient(record: AirtableRecord<AirtableEmailRecipientFields>): EmailRecipient {
  const fields = record.fields
  return { id: record.id, name: fields.Name, campaignId: fields.Campaign[0], companyId: fields.Company[0], contactId: fields.Contact?.[0] ?? null,
    prospectingTargetId: fields['Prospecting Target']?.[0] ?? null, email: fields.Email, recipientType: fields['Recipient Type'] as EmailRecipient['recipientType'],
    status: fields.Status as EmailRecipientStatus, openCount: fields['Open Count'] ?? 0, clickCount: fields['Click Count'] ?? 0,
    lastEventAt: fields['Last Event At'] ?? null, lastClickUrl: fields['Last Click URL'] ?? null, exclusionReason: fields['Exclusion Reason'] ?? null,
    createdAt: fields['Created At'], updatedAt: fields['Updated At'] }
}

export function mapEmailEvent(record: AirtableRecord<AirtableEmailEventFields>): EmailEvent {
  const fields = record.fields
  return { id: record.id, eventKey: fields['Event Key'], recipientId: fields.Recipient[0], eventType: fields['Event Type'] as EmailEvent['eventType'],
    occurredAt: fields['Occurred At'], email: fields.Email, url: fields.URL ?? null, messageId: fields['Message ID'] ?? null,
    rawPayload: fields['Raw Payload'] ?? null, createdAt: fields['Created At'] }
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
    introducedByRelationshipId: fields['Introduced By Relationship']?.[0] ?? null,
    introducedByContactId: fields['Introduced By Contact']?.[0] ?? null,
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
    coldCallTargetId: fields['Cold Call Target']?.[0] ?? null,
    relationshipId: fields.Relationship?.[0] ?? null,
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
    coldCallTargetId: fields['Cold Call Target']?.[0] ?? null,
    relationshipId: fields.Relationship?.[0] ?? null,
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
): StageHistory | null {
  const fields = record.fields

  // STAGE_HISTORY without Opportunity link is invalid for Analytics
  // Return null instead of creating invalid object with opportunityId: ""
  if (!fields.Opportunity || fields.Opportunity.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[mapStageHistory] Skipping invalid record ${record.id}: missing Opportunity link`)
    }
    return null
  }

  return {
    id: record.id,
    opportunityId: fields.Opportunity[0],
    fromStage: (fields['From Stage'] as Stage) ?? null,
    toStage: fields['To Stage'] as Stage,
    changedAt: fields['Changed At'],
    changedBy: fields['Changed By'] as Owner,
  }
}

// ============================================================================
// USERS
// ============================================================================

export function mapUser(record: AirtableRecord<AirtableUserFields>): User {
  const fields = record.fields
  return {
    id: record.id,
    name: fields.Name,
    email: fields.Email,
    passwordHash: fields['Password Hash'],
    role: fields.Role as UserRole,
    active: fields.Active,
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  }
}

// ============================================================================
// COLD_CALL_TARGETS
// ============================================================================

export function mapColdCallTarget(
  record: AirtableRecord<AirtableColdCallTargetFields>
): ColdCallTarget {
  const fields = record.fields
  return {
    id: record.id,
    companyId: fields.Company[0],
    contactId: fields.Contact?.[0] ?? null,
    businessLineId: fields['Business Line'][0],
    owner: fields.Owner as Owner,
    callStatus: fields['Call Status'] as CallStatus,
    opportunityId: fields.Opportunity?.[0] ?? null,
    archived: fields.Archived === true,
    archivedAt: fields['Archived At'] ?? null,
    archivedBy: (fields['Archived By'] as Owner) ?? null,
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  }
}

// ============================================================================
// CALL_STATUS_HISTORY
// ============================================================================

export function mapCallStatusHistory(
  record: AirtableRecord<AirtableCallStatusHistoryFields>
): CallStatusHistory | null {
  const fields = record.fields

  // Call Status History without Cold Call Target link is invalid
  if (!fields['Cold Call Target'] || fields['Cold Call Target'].length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[mapCallStatusHistory] Skipping invalid record ${record.id}: missing Cold Call Target link`)
    }
    return null
  }

  return {
    id: record.id,
    coldCallTargetId: fields['Cold Call Target'][0],
    fromStatus: (fields['From Status'] as CallStatus) ?? null,
    toStatus: fields['To Status'] as CallStatus,
    changedAt: fields['Changed At'],
    changedBy: fields['Changed By'] as Owner,
  }
}

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export function mapRelationship(
  record: AirtableRecord<AirtableRelationshipFields>
): Relationship {
  const fields = record.fields
  return {
    id: record.id,
    name: fields.Name,
    companyId: fields.Company?.[0] ?? null,
    contactId: fields.Contact?.[0] ?? null,
    owner: fields.Owner as Owner,
    relationshipType: fields['Relationship Type'] as RelationshipType,
    status: fields.Status as RelationshipStatus,
    objective: fields.Objective ?? null,
    importance: fields.Importance as RelationshipImportance,
    notes: fields.Notes ?? null,
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  }
}
