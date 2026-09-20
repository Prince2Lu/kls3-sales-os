// Raw Airtable record types
// These represent the actual structure returned by Airtable API

export interface AirtableRecord<T> {
  id: string
  fields: T
  createdTime: string
}

export interface AirtableListResponse<T> {
  records: AirtableRecord<T>[]
  offset?: string
}

// ============================================================================
// RAW AIRTABLE FIELD TYPES
// ============================================================================

export interface AirtableBusinessLineFields {
  Name: string
  Code: string
  Category: string
  'Revenue Trigger': string
  'Revenue Type': string
  'Default Unit Value'?: number
  Active: boolean
  'Prospecting Mode'?: string // Optional for backward compatibility during transition
}

export interface AirtableCompanyFields {
  Name: string
  'Primary Business Line'?: string[] // Linked record to BUSINESS_LINES (single)
  Website?: string
  Industry?: string
  'Address Line 1'?: string
  'Address Line 2'?: string
  'Postal Code'?: string
  City?: string
  Country?: string
  Phone?: string
  'Company Size'?: string
  LinkedIn?: string
  Notes?: string
  'Created At': string
  'Updated At': string
}

export interface AirtableContactFields {
  'First Name': string
  'Last Name': string
  Company?: string[]
  'Business Lines'?: string[] // Linked records to BUSINESS_LINES (optional)
  'Job Title'?: string
  Email?: string
  Phone?: string
  LinkedIn?: string
  Notes?: string
  'Created At': string
  'Updated At': string
}

export interface AirtableOpportunityFields {
  Name: string
  Company?: string[]
  'Primary Contact'?: string[]
  'Business Line': string[]
  Owner: string
  Stage: string
  Source?: string
  Priority?: string
  'Potential Value'?: number
  Probability?: number
  'Expected Close Date'?: string
  Problem?: string
  Need?: string
  'Next Step Notes'?: string
  'Lost Reason'?: string
  'Introduced By Relationship'?: string[] // Link to RELATIONSHIPS
  'Introduced By Contact'?: string[] // Link to CONTACTS
  'Created At': string
  'Updated At': string
  'Won At'?: string
  'Lost At'?: string
}

export interface AirtableActivityFields {
  Opportunity?: string[]
  Contact?: string[]
  'Cold Call Target'?: string[]
  Relationship?: string[] // Link to RELATIONSHIPS
  Type: string
  Date: string
  Result?: string
  Notes?: string
  Owner: string
  'Duration Minutes'?: number
  'Created At': string
}

export interface AirtableTaskFields {
  Opportunity?: string[]
  Contact?: string[]
  'Cold Call Target'?: string[]
  Relationship?: string[] // Link to RELATIONSHIPS
  Type: string
  'Due At'?: string
  Priority?: string
  Status: string
  Notes?: string
  Owner: string
  'Created At': string
  'Completed At'?: string
}

export interface AirtableValueEventFields {
  Opportunity?: string[]
  Contact?: string[]
  'Business Line': string[]
  'Event Type': string
  'Event Date': string
  Amount: number
  'Revenue Type': string
  Status: string
  Notes?: string
  'Created At': string
}

export interface AirtableGoalFields {
  'Business Line': string[]
  Metric: string
  Period: string
  Target: number
  'Ambitious Target'?: number
  'Start Date'?: string
  'End Date'?: string
}

export interface AirtableStageHistoryFields {
  Opportunity: string[]
  'From Stage'?: string
  'To Stage': string
  'Changed At': string
  'Changed By': string
}

export interface AirtableUserFields {
  Name: string
  Email: string
  'Password Hash': string
  Role: string
  Active: boolean
  'Created At': string
  'Updated At': string
}

export interface AirtableColdCallTargetFields {
  Company: string[]
  Contact?: string[]
  'Business Line': string[]
  Owner: string
  'Call Status': string
  Opportunity?: string[]
  Archived?: boolean
  'Archived At'?: string
  'Archived By'?: string
  'Created At': string
  'Updated At': string
}

export interface AirtableCallStatusHistoryFields {
  Name?: string // Primary field (auto-generated or optional)
  'Cold Call Target': string[]
  'From Status'?: string // null for initial transitions
  'To Status': string
  'Changed At': string
  'Changed By': string
}

export interface AirtableRelationshipFields {
  Name: string // Primary field
  Company?: string[] // Link to COMPANIES (single record)
  Contact?: string[] // Link to CONTACTS (single record)
  Owner: string
  'Relationship Type': string
  Status: string
  Objective?: string
  Importance: string
  Notes?: string
  'Created At': string
  'Updated At': string
}
