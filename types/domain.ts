// Domain types for KLS3 Sales OS
// These types represent the business domain, not raw Airtable records

// ============================================================================
// ENUMS AND CONTROLLED VALUES
// ============================================================================

export type BusinessLineCode = 'PAUL' | 'SACHA' | 'CALYMIA' | 'KLS3_NOTAIRES'

export type Category = 'PARTNER' | 'OWNED'

// ProspectingMode: How the business line manages prospects
// - PROSPECTING: Uses PROSPECTING_TARGETS for multi-channel prospecting (cold call, email, LinkedIn)
// - COLD_CALL: Legacy mode (backward compatibility)
// - DIRECT_OPPORTUNITY: Creates Opportunities directly without prospecting phase
export type ProspectingMode = 'PROSPECTING' | 'COLD_CALL' | 'DIRECT_OPPORTUNITY'

export type RevenueType = 'ONE_SHOT' | 'MRR' | 'PROJECT'

export type EventType =
  | 'PAID_MEETING'
  | 'SIGNED_DEAL'
  | 'SUBSCRIPTION_STARTED'
  | 'SIGNED_PROJECT'

export type Stage =
  | 'À prospecter'
  | 'Contacté'
  | 'Échange'
  | 'Qualifié'
  | 'RDV'
  | 'Opportunité'
  | 'Proposition'
  | 'Gagné'
  | 'Perdu'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Source =
  | 'Cold Call'
  | 'Cold Email'
  | 'LinkedIn'
  | 'Referral'
  | 'Website'
  | 'Partner'
  | 'Event'
  | 'Inbound'
  | 'Other'

export type Owner = 'Eric' | 'Lilian'

export type RelationshipType =
  | 'Réseau'
  | 'Prescripteur'
  | 'Apporteur'
  | 'Partenaire'
  | 'Institution'
  | 'Contact stratégique'
  | 'Autre'

export type RelationshipStatus =
  | 'À activer'
  | 'En discussion'
  | 'Action prévue'
  | 'Actif'
  | 'Dormant'
  | 'Clos'

export type RelationshipImportance = 'Haute' | 'Normale' | 'Faible'

export type UserRole = 'ADMIN' | 'SALES_DIRECTOR' | 'SALES'

export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'LINKEDIN'
  | 'MEETING'
  | 'DEMO'
  | 'PROPOSAL'
  | 'NOTE'
  | 'OTHER'

export type ActivityResult =
  | 'NO_ANSWER'
  | 'CONVERSATION'
  | 'MEETING_BOOKED'
  | 'NOT_INTERESTED'
  | 'CALLBACK'
  | 'WRONG_NUMBER'
  | 'VOICEMAIL'
  | 'EMAIL_REQUESTED'
  | 'EMAIL_SENT' // Email sent without reply (no Opportunity)
  | 'EMAIL_REPLY' // Email response received (creates Opportunity)
  | 'LINKEDIN_SENT' // LinkedIn message sent without reply (no Opportunity)
  | 'LINKEDIN_REPLY' // LinkedIn response received (creates Opportunity)

export type TaskType =
  | 'CALL'
  | 'EMAIL'
  | 'LINKEDIN'
  | 'MEETING'
  | 'DEMO'
  | 'PROPOSAL'
  | 'DOCUMENT'
  | 'FOLLOW_UP'
  | 'OTHER'

export type TaskStatus = 'TODO' | 'DONE' | 'CANCELLED'

export type ValueEventStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED'

// ProspectingStatus: Multi-channel prospecting status
// Supports: cold calls, emails, LinkedIn, referrals, etc.
// DECISION: Keep Lilian's familiar UI labels (legacy values remain primary)
export type ProspectingStatus =
  | 'À appeler'        // To be contacted (any channel) - Lilian's familiar label
  | 'À rappeler'       // Scheduled follow-up (any channel) - Lilian's familiar label
  | 'Email Flow'       // In automated/manual sequence - Lilian's familiar label
  | 'Mauvais numéro'   // Unreachable (bad contact info) - Lilian's familiar label
  | 'Pas intéressé'    // Out of target (not interested) - Lilian's familiar label
  | 'RDV booké'        // Meeting booked (MEETING_BOOKED only) - Lilian's familiar label
  | 'Converti'         // Generic conversion (EMAIL_REPLY, CONVERSATION) - Technical status, hidden from board

// Backward compatibility alias (deprecated, use ProspectingStatus)
export type CallStatus = ProspectingStatus

// ============================================================================
// BUSINESS_LINES (Section 22)
// ============================================================================

export interface BusinessLine {
  id: string
  name: string
  code: BusinessLineCode
  category: Category
  revenueTrigger: EventType
  revenueType: RevenueType
  defaultUnitValue: number | null
  active: boolean
  prospectingMode: ProspectingMode
}

// ============================================================================
// COMPANIES (Section 23)
// ============================================================================

export interface Company {
  id: string
  name: string
  primaryBusinessLineId: string | null // Link to BUSINESS_LINES
  website: string | null
  industry: string | null
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  notaryCount: number | null
  importBatchId: string | null
  companySize: string | null
  linkedin: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// CONTACTS (Section 24)
// ============================================================================

export interface Contact {
  id: string
  firstName: string
  lastName: string
  companyId: string | null
  businessLineIds: string[] // Linked records to BUSINESS_LINES (optional segmentation)
  jobTitle: string | null
  email: string | null
  phone: string | null
  decisionMaker: boolean
  linkedin: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ImportBatchStatus = 'PREVIEWED' | 'COMPLETED' | 'FAILED'

export interface ImportBatch {
  id: string
  name: string
  source: string | null
  criteria: string | null
  requestedCount: number
  companiesCreated: number
  companiesUpdated: number
  contactsCreated: number
  duplicatesSkipped: number
  excluded: number
  errors: number
  importedBy: Owner
  status: ImportBatchStatus
  importedAt: string | null
  createdAt: string
}

export type EmailCampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'FAILED'
export type EmailRecipientStatus =
  | 'READY' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'REPLIED'
  | 'SOFT_BOUNCE' | 'HARD_BOUNCE' | 'UNSUBSCRIBED' | 'SPAM' | 'FAILED' | 'EXCLUDED'
export type EmailSuppressionReason =
  | 'UNSUBSCRIBED' | 'OPPOSED' | 'HARD_BOUNCE' | 'SPAM_COMPLAINT' | 'INVALID_EMAIL' | 'MANUAL'

export interface EmailSuppression {
  id: string
  email: string
  companyId: string | null
  contactId: string | null
  scope: 'EMAIL' | 'CONTACT' | 'COMPANY'
  reason: EmailSuppressionReason
  source: 'BREVO' | 'REPLY' | 'CRM' | 'IMPORT'
  active: boolean
  details: string | null
  createdAt: string
}

export interface EmailCampaign {
  id: string
  name: string
  businessLineId: string
  brevoCampaignId: string | null
  status: EmailCampaignStatus
  subject: string
  templateId: string | null
  senderName: string
  senderEmail: string
  replyTo: string | null
  recipientCount: number
  createdBy: Owner
  createdAt: string
  sentAt: string | null
}

export interface EmailRecipient {
  id: string
  name: string
  campaignId: string
  companyId: string
  contactId: string | null
  prospectingTargetId: string | null
  email: string
  recipientType: 'COMPANY' | 'CONTACT'
  status: EmailRecipientStatus
  openCount: number
  clickCount: number
  lastEventAt: string | null
  lastClickUrl: string | null
  exclusionReason: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailEvent {
  id: string
  eventKey: string
  recipientId: string
  eventType: Exclude<EmailRecipientStatus, 'READY' | 'REPLIED' | 'EXCLUDED'> | 'ERROR'
  occurredAt: string
  email: string
  url: string | null
  messageId: string | null
  rawPayload: string | null
  createdAt: string
}

// ============================================================================
// OPPORTUNITIES (Section 25)
// ============================================================================

export interface Opportunity {
  id: string
  name: string
  companyId: string | null
  primaryContactId: string | null
  businessLineId: string
  owner: Owner
  stage: Stage
  source: Source | null
  priority: Priority | null
  potentialValue: number | null
  probability: number | null
  expectedCloseDate: string | null
  problem: string | null
  need: string | null
  nextStepNotes: string | null
  lostReason: string | null
  introducedByRelationshipId: string | null // Link to RELATIONSHIPS
  introducedByContactId: string | null // Link to CONTACTS
  createdAt: string
  updatedAt: string
  wonAt: string | null
  lostAt: string | null
}

// ============================================================================
// ACTIVITIES (Section 26)
// ============================================================================

export interface Activity {
  id: string
  opportunityId: string | null
  contactId: string | null
  coldCallTargetId: string | null
  relationshipId: string | null // Link to RELATIONSHIPS
  type: ActivityType
  date: string
  result: ActivityResult | null
  notes: string | null
  owner: Owner
  durationMinutes: number | null
  createdAt: string
}

// ============================================================================
// TASKS (Section 27)
// ============================================================================

export interface Task {
  id: string
  opportunityId: string | null
  contactId: string | null
  coldCallTargetId: string | null
  relationshipId: string | null // Link to RELATIONSHIPS
  type: TaskType
  dueAt: string | null
  priority: Priority | null
  status: TaskStatus
  notes: string | null
  owner: Owner
  createdAt: string
  completedAt: string | null
}

// ============================================================================
// VALUE_EVENTS (Section 28)
// ============================================================================

export interface ValueEvent {
  id: string
  opportunityId: string | null
  contactId: string | null
  businessLineId: string
  eventType: EventType
  eventDate: string
  amount: number
  revenueType: RevenueType
  status: ValueEventStatus
  notes: string | null
  createdAt: string
}

// ============================================================================
// GOALS (Section 29)
// ============================================================================

export interface Goal {
  id: string
  businessLineId: string
  metric: string
  period: string
  target: number
  ambitiousTarget: number | null
  startDate: string | null
  endDate: string | null
}

// ============================================================================
// STAGE_HISTORY (Section 30)
// ============================================================================

export interface StageHistory {
  id: string
  opportunityId: string
  fromStage: Stage | null
  toStage: Stage
  changedAt: string
  changedBy: Owner
}

// ============================================================================
// USERS (Phase 8: Airtable-based Authentication)
// ============================================================================

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================================
// PROSPECTING_TARGETS (Pre-opportunity prospecting tracking)
// Multi-channel: cold call, email, LinkedIn, referrals, etc.
// ============================================================================

export interface ProspectingTarget {
  id: string
  companyId: string
  contactId: string | null
  businessLineId: string
  owner: Owner
  prospectingStatus: ProspectingStatus
  opportunityId: string | null // Set when converted to Opportunity
  archived: boolean
  archivedAt: string | null
  archivedBy: Owner | null
  createdAt: string
  updatedAt: string
}

// Backward compatibility alias (deprecated, use ProspectingTarget)
// Note: Uses 'callStatus' property name for Airtable backward compatibility
export interface ColdCallTarget {
  id: string
  companyId: string
  contactId: string | null
  businessLineId: string
  owner: Owner
  callStatus: CallStatus // Maps to prospectingStatus in Airtable
  opportunityId: string | null
  archived: boolean
  archivedAt: string | null
  archivedBy: Owner | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// PROSPECTING_STATUS_HISTORY (Prospecting status transition history)
// ============================================================================

export interface ProspectingStatusHistory {
  id: string
  prospectingTargetId: string // Link to PROSPECTING_TARGETS
  fromStatus: ProspectingStatus | null // null for initial status
  toStatus: ProspectingStatus
  changedAt: string
  changedBy: Owner
}

// Backward compatibility alias (deprecated, use ProspectingStatusHistory)
export interface CallStatusHistory {
  id: string
  coldCallTargetId: string // Maps to prospectingTargetId
  fromStatus: CallStatus | null
  toStatus: CallStatus
  changedAt: string
  changedBy: Owner
}

// ============================================================================
// RELATIONSHIPS (Relations stratégiques)
// ============================================================================

export interface Relationship {
  id: string
  name: string
  companyId: string | null // Link to COMPANIES
  contactId: string | null // Link to CONTACTS
  owner: Owner
  relationshipType: RelationshipType
  status: RelationshipStatus
  objective: string | null
  importance: RelationshipImportance
  notes: string | null
  createdAt: string
  updatedAt: string
}
