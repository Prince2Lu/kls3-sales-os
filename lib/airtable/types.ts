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
}

export interface AirtableCompanyFields {
  Name: string
  Website?: string
  Industry?: string
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
  'Created At': string
  'Updated At': string
  'Won At'?: string
  'Lost At'?: string
}

export interface AirtableActivityFields {
  Opportunity?: string[]
  Contact?: string[]
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
