# PHASE 9A — VALUE_EVENTS MODEL AUDIT REPORT

**Date:** 2026-09-05
**Scope:** Audit existing VALUE_EVENTS implementation before Phase 9 development
**Status:** ✅ SCHEMA COMPLETE — NO SCHEMA CHANGES REQUIRED

---

## EXECUTIVE SUMMARY

The VALUE_EVENTS table and associated TypeScript types **already exist and are complete**. All required fields for Phase 9 economic workflow are present in the current schema.

**Result:** ✅ NO AIRTABLE SCHEMA CHANGES NEEDED

Phase 9 can proceed directly to UI/UX implementation without backend schema modifications.

---

## CURRENT VALUE_EVENTS SCHEMA

### Domain Type (`types/domain.ts`)

```typescript
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
```

### Airtable Type (`lib/airtable/types.ts`)

```typescript
export interface AirtableValueEventFields {
  Opportunity?: string[]          // Link to OPPORTUNITIES
  Contact?: string[]               // Link to CONTACTS
  'Business Line': string[]        // Link to BUSINESS_LINES (required)
  'Event Type': string             // PAID_MEETING | SIGNED_DEAL | SUBSCRIPTION_STARTED | SIGNED_PROJECT
  'Event Date': string             // ISO date
  Amount: number                   // Revenue amount
  'Revenue Type': string           // ONE_SHOT | MRR | PROJECT
  Status: string                   // PENDING | CONFIRMED | PAID | CANCELLED
  Notes?: string                   // Optional notes
  'Created At': string             // ISO dateTime
}
```

### Controlled Value Types

```typescript
// Event Types (matches Business Line revenue triggers)
export type EventType =
  | 'PAID_MEETING'           // PAUL
  | 'SIGNED_DEAL'            // LEVERIO (SACHA)
  | 'SUBSCRIPTION_STARTED'   // CALYMIA
  | 'SIGNED_PROJECT'         // KLS3_NOTAIRES

// Revenue Types
export type RevenueType = 'ONE_SHOT' | 'MRR' | 'PROJECT'

// Value Event Status (Phase 9 KPI inclusion rules)
export type ValueEventStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED'
```

---

## EXISTING CRUD FUNCTIONS

### Read Operations

**File:** `lib/airtable/client.ts`

1. **`getValueEvents(options?)`** (line 420)
   - Fetches VALUE_EVENTS with optional filtering
   - Supports `maxRecords` parameter
   - Returns: `Promise<ValueEvent[]>`

2. **`getValueEventById(id)`** (line 465)
   - Fetches single VALUE_EVENT by ID
   - Returns: `Promise<ValueEvent>`

### Write Operations

**File:** `lib/airtable/client.ts`

1. **`createValueEvent(input)`** (line 965)
   - Creates new VALUE_EVENT record
   - Input interface: `CreateValueEventInput`
   - Sets `Created At` timestamp automatically
   - Returns: `Promise<ValueEvent>`

2. **`updateValueEvent(id, input)`** (line 990)
   - Updates existing VALUE_EVENT
   - Partial update support
   - Returns: `Promise<ValueEvent>`

### CreateValueEventInput Interface

```typescript
export interface CreateValueEventInput {
  opportunityId?: string      // Optional link to opportunity
  contactId?: string           // Optional link to contact
  businessLineId: string       // Required link to business line
  eventType: string            // Required event type
  eventDate: string            // Required ISO date
  amount: number               // Required amount
  revenueType: string          // Required revenue type
  status: string               // Required status
  notes?: string               // Optional notes
}
```

**Status:** ✅ Complete and functional

---

## EXISTING KPI CALCULATIONS

### Revenue Functions (`lib/utils/dashboard-kpis.ts`)

#### 1. `calculateConfirmedRevenue(valueEvents, businessLineIds?)`

**Purpose:** Calculate ONE_SHOT and PROJECT revenue

**KPI Inclusion Rules:**
```typescript
// INCLUDED
status === 'CONFIRMED' OR status === 'PAID'

// EXCLUDED
status === 'PENDING'     // Not yet recognized
status === 'CANCELLED'   // Cancelled events
revenueType === 'MRR'    // Handled separately
```

**Usage:** Partner Revenue, Owned Revenue (non-MRR)

**Status:** ✅ CORRECT — Matches Phase 9 requirements

---

#### 2. `calculateMRR(valueEvents)`

**Purpose:** Calculate Monthly Recurring Revenue from CALYMIA subscriptions

**KPI Inclusion Rules:**
```typescript
// INCLUDED
status === 'CONFIRMED' OR status === 'PAID'
revenueType === 'MRR'

// EXCLUDED
status === 'PENDING'
status === 'CANCELLED'
revenueType !== 'MRR'
```

**Status:** ✅ CORRECT — Matches Phase 9 requirements

---

#### 3. `calculatePartnerRevenue(valueEvents, businessLines)`

**Purpose:** Sum revenue from PARTNER category business lines (PAUL + LEVERIO)

**Logic:**
```typescript
const partnerIds = businessLines
  .filter(bl => bl.category === 'PARTNER')
  .map(bl => bl.id)

return calculateConfirmedRevenue(valueEvents, partnerIds)
```

**Status:** ✅ CORRECT

---

#### 4. `calculateOwnedRevenue(valueEvents, businessLines)`

**Purpose:** Sum revenue from OWNED category business lines (CALYMIA + KLS3_NOTAIRES), excluding MRR

**Logic:**
```typescript
const ownedIds = businessLines
  .filter(bl => bl.category === 'OWNED')
  .map(bl => bl.id)

return calculateConfirmedRevenue(valueEvents, ownedIds)
```

**Status:** ✅ CORRECT

---

## DASHBOARD INTEGRATION

### Current VALUE_EVENTS Usage

**Files using VALUE_EVENTS:**
1. `app/dashboard/page.tsx` — Fetches all VALUE_EVENTS server-side
2. `app/dashboard/dashboard-client.tsx` — Passes to child components, filters by period
3. `app/dashboard/global-kpis.tsx` — Displays Partner/Owned revenue, MRR
4. `app/dashboard/business-line-cards.tsx` — Shows per-BL economic metrics
5. `lib/utils/dashboard-kpis.ts` — Core KPI calculations

**Data Flow:**
```
Server (page.tsx)
  → getValueEvents({ maxRecords: 1000 })
  → Pass to DashboardClient

Client (dashboard-client.tsx)
  → Filter by period
  → Pass to GlobalKPIs, BusinessLineCards

KPIs (global-kpis.tsx)
  → calculatePartnerRevenue()
  → calculateOwnedRevenue()
  → calculateMRR()
```

**Status:** ✅ Already using VALUE_EVENTS correctly for revenue display

---

## FIELDS ANALYSIS

### Fields Present ✅

| Field | Type | Nullability | Purpose |
|-------|------|-------------|---------|
| `id` | string | Required | Airtable record ID |
| `opportunityId` | string | Nullable | Link to opportunity (optional) |
| `contactId` | string | Nullable | Link to contact (optional) |
| `businessLineId` | string | Required | Link to business line |
| `eventType` | EventType | Required | Economic event type |
| `eventDate` | string (ISO) | Required | When event occurred |
| `amount` | number | Required | Revenue amount |
| `revenueType` | RevenueType | Required | Revenue model type |
| `status` | ValueEventStatus | Required | Recognition status |
| `notes` | string | Nullable | Optional context |
| `createdAt` | string (ISO) | Required | Record creation timestamp |

### Fields Missing ❌

**None**

All fields required for Phase 9 economic workflow are present.

### Optional Future Enhancements (NOT REQUIRED FOR PHASE 9)

These fields are **NOT needed** for Phase 9 but could be added later if business requirements emerge:

1. **`updatedAt`** — Track modifications (currently not present, not required)
2. **`owner`** — Track who created the event (not currently needed)
3. **`confirmedAt` / `paidAt`** — Granular status change timestamps (not currently needed)

**Decision:** ✅ Do NOT add these fields in Phase 9 unless explicitly required by workflow

---

## BUSINESS LINE INTEGRATION

### Business Line Schema (`types/domain.ts`)

```typescript
export interface BusinessLine {
  id: string
  name: string
  code: BusinessLineCode
  category: Category
  revenueTrigger: EventType      // ← Links to VALUE_EVENT.eventType
  revenueType: RevenueType        // ← Links to VALUE_EVENT.revenueType
  defaultUnitValue: number | null
  active: boolean
}
```

**Mapping:**

| Business Line | Code | Category | Revenue Trigger | Revenue Type | Default Unit Value |
|---------------|------|----------|-----------------|--------------|-------------------|
| Paul | PAUL | PARTNER | PAID_MEETING | ONE_SHOT | 100 € |
| Leverio | SACHA | PARTNER | SIGNED_DEAL | ONE_SHOT | null |
| Calymia | CALYMIA | OWNED | SUBSCRIPTION_STARTED | MRR | null |
| KLS3 Notaires | KLS3_NOTAIRES | OWNED | SIGNED_PROJECT | PROJECT | null |

**Status:** ✅ Business Line metadata fully supports Phase 9 VALUE_EVENT creation workflow

---

## PHASE 9 COMPATIBILITY

### Schema Changes Required

**Answer:** ✅ **NONE**

Current Airtable schema supports all Phase 9 requirements:

1. ✅ Event type validation (EventType enum)
2. ✅ Revenue type classification (RevenueType enum)
3. ✅ Status-based KPI inclusion (ValueEventStatus enum)
4. ✅ Business Line linkage (businessLineId)
5. ✅ Opportunity linkage (opportunityId, nullable)
6. ✅ Amount storage (number field)
7. ✅ Event date tracking (ISO string)
8. ✅ Notes field (optional context)

### CRUD Operations Status

1. ✅ **Read** — `getValueEvents()`, `getValueEventById()` exist
2. ✅ **Create** — `createValueEvent()` exists with full validation
3. ✅ **Update** — `updateValueEvent()` exists
4. ❌ **Delete** — Not currently implemented (NOT REQUIRED for Phase 9)

### KPI Calculation Status

1. ✅ **Confirmed Revenue** — Correctly filters CONFIRMED + PAID, excludes PENDING + CANCELLED
2. ✅ **MRR** — Correctly filters MRR events only
3. ✅ **Partner Revenue** — Correctly sums PARTNER category BLs
4. ✅ **Owned Revenue** — Correctly sums OWNED category BLs (excluding MRR)
5. ✅ **Period filtering** — Already implemented in dashboard-client.tsx

**Conclusion:** All KPI logic is correct and matches Phase 9 requirements.

---

## INTEGRITY GAP IDENTIFIED

### "Gagnés sans valeur enregistrée"

**Current State:** ❌ NOT IMPLEMENTED

**Definition:** Opportunities with `Stage = "Gagné"` that lack a qualifying VALUE_EVENT

**Business Rule:**
```typescript
// Opportunity is "Gagné sans valeur" if:
opportunity.stage === 'Gagné'
AND no VALUE_EVENT where:
  - valueEvent.opportunityId === opportunity.id
  - valueEvent.eventType === opportunity.businessLine.revenueTrigger
  - valueEvent.status IN ('CONFIRMED', 'PAID')
```

**Phase 9 Requirement:** Add this as a Dashboard integrity KPI

**Implementation Status:** ✅ Ready to implement (no schema changes needed)

---

## DUPLICATE PROTECTION GAP

**Current State:** ❌ NOT IMPLEMENTED

**Phase 9 Requirement:** Prevent accidental duplicate VALUE_EVENT creation

**Business-Aware Rules:**

| Business Line | Duplication Rule |
|---------------|-----------------|
| PAUL | ✅ Multiple PAID_MEETING events allowed (if business model permits) |
| Leverio | ⚠️ Normally one active SIGNED_DEAL per opportunity |
| Calymia | ⚠️ One active SUBSCRIPTION_STARTED per subscription |
| KLS3 Notaires | ⚠️ Normally one active SIGNED_PROJECT per opportunity |

**Recommended Approach:**
- Check for existing VALUE_EVENT with same `opportunityId` + `eventType` + `status IN ('CONFIRMED', 'PAID')`
- Warn user if duplicate detected
- Allow override if business logic permits (e.g., PAUL multiple meetings)

**Implementation Status:** ⏳ To be implemented in Phase 9

---

## UI INTEGRATION GAPS

### 1. VALUE_EVENT Creation UI

**Current State:** ❌ NOT IMPLEMENTED

**Phase 9 Requirements:**
- CTA on opportunity detail page: "Enregistrer la valeur"
- Business Line-aware form
- Server-side validation
- Duplicate protection

**Status:** ⏳ To be implemented

### 2. VALUE_EVENT Display on Opportunity Detail

**Current State:** ❌ NOT IMPLEMENTED

**Phase 9 Requirements:**
- Show economic information if VALUE_EVENTS exist for opportunity
- Display: event type, amount, date, status, BL
- History list if multiple events

**Status:** ⏳ To be implemented

### 3. Dashboard Integrity KPI

**Current State:** ❌ NOT IMPLEMENTED

**Phase 9 Requirements:**
- Display count of "Gagnés sans valeur enregistrée"
- Optionally link to filtered view

**Status:** ⏳ To be implemented

---

## TECHNICAL VALIDATION

### TypeScript Types

✅ **COMPLETE**
- All domain types defined
- All Airtable types defined
- All enum types defined
- Mapper functions complete

### Airtable Integration

✅ **FUNCTIONAL**
- Read operations work
- Create operations work
- Update operations work
- Field mapping correct

### Data Flow

✅ **CORRECT**
- Server-side data fetching
- Client-side period filtering
- KPI calculations accurate
- Revenue recognition rules match Phase 9 spec

---

## PHASE 9 IMPLEMENTATION PLAN

### What Needs To Be Built

#### Phase 9B — Economic Value CTA ⏳
- Add "Enregistrer la valeur" button to opportunity detail page
- Show/hide based on opportunity stage and existing VALUE_EVENTS
- Link to VALUE_EVENT creation form

#### Phase 9C — Business-Line-Aware Form ⏳
- Create VALUE_EVENT form component
- Adapt fields based on opportunity's Business Line
- Pre-fill amount from BL.defaultUnitValue when available
- Localize labels (French UI, English code)

#### Phase 9D — Server Action ⏳
- Create Next.js Server Action for VALUE_EVENT creation
- Validate business line match
- Validate event type matches BL revenue trigger
- Validate amount, date, status
- Call existing `createValueEvent()` function

#### Phase 9E — Duplicate Protection ⏳
- Check for existing qualifying VALUE_EVENTS
- Implement business-aware duplication rules
- Warn user or block based on BL-specific logic

#### Phase 9F — Integrity KPI ⏳
- Add "Gagnés sans valeur enregistrée" to Dashboard
- Calculate count of Gagné opportunities without qualifying VALUE_EVENT
- Optionally link to filtered view

#### Phase 9G — Label Clarity ⏳
- Update Dashboard KPI labels for clarity
- "Partner Revenue" → "Revenue Partner"
- "Owned Revenue" → "Revenue KLS3"
- Add new integrity KPI label

#### Phase 9H — VALUE_EVENT Display ⏳
- Show VALUE_EVENTS on opportunity detail page
- Display event information
- Handle multiple events (history list)

### What Does NOT Need To Be Built

❌ Airtable schema changes
❌ New database tables
❌ New domain types
❌ New KPI calculation logic (already correct)
❌ Dashboard data fetching changes
❌ Revenue recognition rule changes

---

## FINAL AUDIT RESULTS

### 1. Existing VALUE_EVENTS Schema

**Status:** ✅ COMPLETE

**Fields Present:**
- id, opportunityId, contactId, businessLineId
- eventType, eventDate, amount, revenueType
- status, notes, createdAt

**Fields Missing:** None

### 2. Schema Changes Required

**Answer:** ✅ NO

### 3. CRUD Functions

**Status:** ✅ FUNCTIONAL
- ✅ Read: `getValueEvents()`, `getValueEventById()`
- ✅ Create: `createValueEvent()`
- ✅ Update: `updateValueEvent()`

### 4. KPI Calculations

**Status:** ✅ CORRECT
- ✅ Confirmed Revenue logic matches Phase 9 spec
- ✅ MRR calculation correct
- ✅ Partner/Owned revenue separation correct
- ✅ Status-based inclusion rules correct (CONFIRMED + PAID only)

### 5. Business Line Integration

**Status:** ✅ COMPLETE
- ✅ BL.revenueTrigger → VALUE_EVENT.eventType mapping
- ✅ BL.revenueType → VALUE_EVENT.revenueType mapping
- ✅ BL.defaultUnitValue available for form pre-fill

### 6. Dashboard Integration

**Status:** ✅ FUNCTIONAL
- ✅ VALUE_EVENTS fetched server-side
- ✅ Passed to Dashboard components
- ✅ Used in revenue KPI calculations

### 7. UI Gaps Identified

**Status:** ⏳ TO IMPLEMENT
- ⏳ VALUE_EVENT creation CTA
- ⏳ Business Line-aware form
- ⏳ Server action with validation
- ⏳ Duplicate protection
- ⏳ Integrity KPI "Gagnés sans valeur"
- ⏳ VALUE_EVENT display on opportunity detail

### 8. Data Model Limitations

**Found:** ✅ NONE

The current VALUE_EVENTS data model fully supports all Phase 9 requirements without modifications.

---

## RECOMMENDATION

**Proceed directly to Phase 9B-H implementation.**

No backend schema changes required. Focus entirely on:
1. UI/UX for VALUE_EVENT creation
2. Server-side validation
3. Duplicate protection logic
4. Dashboard integrity KPI
5. Opportunity detail VALUE_EVENT display

**Estimated Scope:**
- Small (UI + validation only)
- No database migrations
- No breaking changes
- No data backfill required

---

**END OF PHASE 9A AUDIT REPORT**
