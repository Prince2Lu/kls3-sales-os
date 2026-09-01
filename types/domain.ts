// Domain types for KLS3 Sales OS
// These types represent the business domain, not raw Airtable records

// ============================================================================
// ENUMS AND CONTROLLED VALUES
// ============================================================================

export type BusinessLineCode = 'PAUL' | 'SACHA' | 'CALYMIA' | 'KLS3_NOTAIRES'

export type Category = 'PARTNER' | 'OWNED'

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

export type TaskType =
  | 'CALL'
  | 'EMAIL'
  | 'LINKEDIN'
  | 'MEETING'
  | 'DEMO'
  | 'FOLLOW_UP'
  | 'OTHER'

export type TaskStatus = 'TODO' | 'DONE' | 'CANCELLED'

export type ValueEventStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED'

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
}

// ============================================================================
// COMPANIES (Section 23)
// ============================================================================

export interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  city: string | null
  country: string | null
  phone: string | null
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
  jobTitle: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
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
