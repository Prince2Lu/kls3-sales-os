# ECONOMIC EVENTS & REVENUE MODEL — USER GUIDE

**KLS3 Sales OS — Phase 9**
**Last Updated:** 2026-09-05

---

## TABLE OF CONTENTS

1. [Core Principle](#core-principle)
2. [VALUE_EVENT Model](#value_event-model)
3. [Business Line Workflows](#business-line-workflows)
4. [Revenue Recognition Rules](#revenue-recognition-rules)
5. [Creating Economic Events](#creating-economic-events)
6. [Editing Economic Events](#editing-economic-events)
7. [Dashboard KPIs](#dashboard-kpis)
8. [Integrity Monitoring](#integrity-monitoring)
9. [Common Scenarios](#common-scenarios)
10. [Troubleshooting](#troubleshooting)

---

## CORE PRINCIPLE

### Commercial Truth ≠ Economic Truth

**Commercial Truth:**
- Opportunity Stage = "Gagné"
- Represents sales process completion
- Managed in Pipeline

**Economic Truth:**
- VALUE_EVENT with status CONFIRMED or PAID
- Represents actual economic value generated
- Managed in Opportunity Detail → "Valeur économique"

**Critical Rule:**
> Moving an opportunity to "Gagné" does NOT automatically create revenue. You must explicitly register the economic event.

---

## VALUE_EVENT MODEL

### What is a VALUE_EVENT?

A VALUE_EVENT represents a real economic transaction that generates value for KLS3.

### Event Types

Each Business Line has a specific revenue trigger:

| Business Line | Event Type | Revenue Type | Description |
|---------------|------------|--------------|-------------|
| **PAUL** | PAID_MEETING | ONE_SHOT | RDV rémunéré validé |
| **LEVERIO** | SIGNED_DEAL | ONE_SHOT | Deal signé par le client |
| **CALYMIA** | SUBSCRIPTION_STARTED | MRR | Abonnement démarré |
| **KLS3 Notaires** | SIGNED_PROJECT | PROJECT | Projet signé |

### Status Lifecycle

```
PENDING → En attente
  ↓ (confirmation)
CONFIRMED → Confirmé ✓ Counts toward revenue
  ↓ (payment)
PAID → Payé ✓ Counts toward revenue
  ↓ (cancellation)
CANCELLED → Annulé ✗ Excluded from revenue
```

**Revenue Recognition:**
- ✅ **CONFIRMED** and **PAID** → Included in revenue KPIs
- ❌ **PENDING** and **CANCELLED** → Excluded from revenue KPIs

---

## BUSINESS LINE WORKFLOWS

### PAUL — RDV Rémunéré

**Model:** ONE_SHOT revenue per paid meeting

**Default Amount:** 100 €

**Workflow:**
1. Opportunity reaches "Gagné" when RDV is scheduled and criteria met
2. Create VALUE_EVENT with:
   - Event Type: PAID_MEETING
   - Amount: 100 € (pre-filled, editable)
   - Status: PENDING (default) or CONFIRMED
   - Date: RDV date
3. Update to CONFIRMED when partner validates eligibility
4. Update to PAID when payment received

**Duplicate Protection:** ❌ None
Multiple PAID_MEETING events allowed per opportunity.

**Example:**
```
Opportunity: "Client ABC - RDV Diagnostic"
VALUE_EVENT 1: RDV 2026-09-10, 100 €, CONFIRMED
VALUE_EVENT 2: RDV 2026-10-15, 100 €, PAID
→ Revenue Partner: 200 €
```

---

### LEVERIO — Deal Signé

**Model:** ONE_SHOT revenue per signed deal

**Default Amount:** None (manual entry required)

**Workflow:**
1. Opportunity progresses through Proposition → Gagné
2. Create VALUE_EVENT with:
   - Event Type: SIGNED_DEAL
   - Amount: Commission amount (manual)
   - Status: PENDING or CONFIRMED
   - Date: Signature date
3. Update to CONFIRMED when deal validated
4. Update to PAID when commission received

**Duplicate Protection:** ✅ Yes
Only ONE active SIGNED_DEAL allowed per opportunity.

**Error if duplicate:**
> "Un deal signé existe déjà pour cette opportunité"

**Example:**
```
Opportunity: "Entreprise XYZ - Solutions IT"
VALUE_EVENT: Deal signé 2026-09-01, 1 500 €, CONFIRMED
→ Revenue Partner: 1 500 €
```

---

### CALYMIA — Abonnement

**Model:** MRR (Monthly Recurring Revenue)

**Plans:**
- Essentiel: 29 €/mois
- Pro: 59 €/mois
- Cabinet: 139 €/mois

**Workflow:**
1. Client starts subscription (trial or direct)
2. Create VALUE_EVENT with:
   - Event Type: SUBSCRIPTION_STARTED
   - Plan: Select from dropdown
   - Amount: Auto-set from plan (29/59/139 €)
   - Status: PENDING or CONFIRMED
   - Date: Subscription start date
3. Update to CONFIRMED when subscription active and paying
4. Update to CANCELLED if subscription cancelled

**Duplicate Protection:** ✅ Yes
Only ONE active SUBSCRIPTION_STARTED allowed per opportunity.

**Error if duplicate:**
> "Un abonnement actif existe déjà pour cette opportunité"

**MRR Calculation:**
- MRR = Sum of all CONFIRMED/PAID SUBSCRIPTION_STARTED amounts
- PENDING subscriptions do NOT count toward MRR
- CANCELLED subscriptions are excluded

**Example:**
```
Opportunity: "Cabinet Martin - Calymia Pro"
VALUE_EVENT: Abonnement démarré 2026-08-15, 59 €/mois, CONFIRMED
→ MRR: +59 €
→ Revenue KLS3: 0 € (MRR counted separately)
```

**Note:** Phase 9 does NOT model churn. MRR is cumulative. Phase 10 may add subscription end dates.

---

### KLS3 Notaires — Projet Signé

**Model:** PROJECT revenue per signed project

**Default Amount:** None (manual entry required)

**Workflow:**
1. Opportunity reaches Proposition → signature
2. Create VALUE_EVENT with:
   - Event Type: SIGNED_PROJECT
   - Amount: Project value (manual)
   - Status: PENDING or CONFIRMED
   - Date: Signature date
3. Update to CONFIRMED when contract validated
4. Update to PAID when payment received

**Duplicate Protection:** ✅ Yes
Only ONE active SIGNED_PROJECT allowed per opportunity.

**Error if duplicate:**
> "Un projet signé existe déjà pour cette opportunité"

**Example:**
```
Opportunity: "Notaire Dupont - Digitalisation"
VALUE_EVENT: Projet signé 2026-09-01, 12 000 €, CONFIRMED
→ Revenue KLS3: 12 000 €
```

---

## REVENUE RECOGNITION RULES

### Conservative Default

**All new VALUE_EVENTS default to PENDING.**

**Rationale:**
- Prevents accidental revenue inflation
- Forces explicit confirmation before KPI impact
- Allows recording uncertain events early

### Status Transitions

| Transition | Revenue Impact | Use Case |
|------------|----------------|----------|
| Create PENDING | No impact | Record event, not yet confirmed |
| PENDING → CONFIRMED | +Amount | Economic event validated |
| PENDING → PAID | +Amount | Payment received directly |
| CONFIRMED → PAID | No change | Status update only |
| CONFIRMED → CANCELLED | -Amount | Deal cancelled after confirmation |
| PENDING → CANCELLED | No impact | Event cancelled before confirmation |

### KPI Inclusion

**Dashboard "Revenue Partner":**
- Includes: PAUL + LEVERIO CONFIRMED/PAID events
- Excludes: PENDING, CANCELLED
- Revenue Type: ONE_SHOT only

**Dashboard "Revenue KLS3":**
- Includes: KLS3_NOTAIRES CONFIRMED/PAID events
- Excludes: PENDING, CANCELLED, MRR
- Revenue Type: ONE_SHOT + PROJECT

**Dashboard "MRR":**
- Includes: CALYMIA CONFIRMED/PAID events
- Excludes: PENDING, CANCELLED
- Revenue Type: MRR only

---

## CREATING ECONOMIC EVENTS

### Location

**Opportunity Detail Page → "Valeur économique" card**

### Button

**"Enregistrer la valeur"**

- Visible when: Business Line assigned to opportunity
- Hidden when: Active event already exists (except PAUL)

### Form Fields

**1. Event Date**
- Label adapts to Business Line:
  - PAUL: "Date du RDV"
  - LEVERIO: "Date de signature"
  - CALYMIA: "Date de démarrage"
  - KLS3_NOTAIRES: "Date de signature"
- Default: Today
- Required

**2. Status**
- Options: En attente | Confirmé | Payé | Annulé
- Default: **En attente** (PENDING)
- Required
- **Key Decision:** Choose CONFIRMÉ if economically certain

**3. Amount**
- PAUL: Pre-filled with 100 € (editable)
- CALYMIA: Auto-set from plan selection
- LEVERIO/KLS3: Manual entry
- Required, must be > 0

**4. Plan (CALYMIA only)**
- Dropdown: Essentiel (29€) | Pro (59€) | Cabinet (139€)
- Auto-sets amount
- Required for CALYMIA

**5. Notes (optional)**
- Free text
- Context or additional information

### Submit

**Button:** "Enregistrer la valeur"

**Success:**
- Form closes
- Event appears in history
- Dashboard KPIs update automatically

**Error Handling:**
- Duplicate protection errors (if applicable)
- Validation errors (amount, date)
- Server errors

---

## EDITING ECONOMIC EVENTS

### Access

**In "Valeur économique" history → Click "Modifier" next to event**

### Editable Fields

✅ **Can Edit:**
- Status (PENDING → CONFIRMED, etc.)
- Amount
- Event Date
- Notes

❌ **Cannot Edit:**
- Event Type (PAID_MEETING, SIGNED_DEAL, etc.)
- Revenue Type (ONE_SHOT, MRR, PROJECT)
- Business Line
- Opportunity

**Rationale:** Economic event type is determined by Business Line and cannot be arbitrarily changed.

### Form Behavior

**Header:** "Modifier l'événement"

**Pre-filled:** All current values

**Plan Selector:** Hidden (eventType unchangeable)

**Button:** "Mettre à jour"

### Common Use Cases

**1. Confirm Pending Event:**
```
Current: PENDING, 1 000 €
Action: Change status to CONFIRMED
Result: Revenue +1 000 €
```

**2. Mark as Paid:**
```
Current: CONFIRMED, 500 €
Action: Change status to PAID
Result: No revenue change (already counted)
```

**3. Cancel Event:**
```
Current: CONFIRMED, 2 000 €
Action: Change status to CANCELLED
Result: Revenue -2 000 €
```

**4. Update Amount:**
```
Current: CONFIRMED, 10 000 €
Action: Change amount to 12 000 €
Result: Revenue +2 000 € (delta)
```

### Duplicate Protection

✅ **No false positives when editing same event**

Editing a PENDING event to CONFIRMED does NOT trigger:
> "Un événement économique actif existe déjà"

Only creating a NEW event triggers duplicate checks.

---

## DASHBOARD KPIS

### Revenue Partner

**Definition:** Revenue generated through partner Business Lines (PAUL + LEVERIO)

**Calculation:**
```
Sum of VALUE_EVENTS where:
- Business Line category = PARTNER
- Status = CONFIRMED or PAID
- Revenue Type ≠ MRR
```

**Display:** "Revenue Partner"

**Period:** Filtered by selected period (day/week/month/custom)

---

### Revenue KLS3

**Definition:** Revenue generated through owned Business Lines (KLS3 Notaires)

**Calculation:**
```
Sum of VALUE_EVENTS where:
- Business Line category = OWNED
- Status = CONFIRMED or PAID
- Revenue Type ≠ MRR
```

**Display:** "Revenue KLS3"

**Period:** Filtered by selected period

**Note:** CALYMIA MRR is counted separately, not in Revenue KLS3.

---

### MRR (Monthly Recurring Revenue)

**Definition:** Current confirmed MRR from CALYMIA subscriptions

**Calculation:**
```
Sum of VALUE_EVENTS where:
- Revenue Type = MRR
- Status = CONFIRMED or PAID
```

**Display:** "X € / mois"

**Period:** NOT period-filtered (current state, not flow)

**Note:** Phase 9 does NOT subtract cancelled subscriptions. MRR is cumulative.

---

## INTEGRITY MONITORING

### "Gagnés sans valeur enregistrée"

**Location:** Dashboard → "À surveiller" section

**Definition:**
```
Count of opportunities where:
- Stage = "Gagné"
- AND no qualifying VALUE_EVENT exists
```

**Qualifying VALUE_EVENT:**
```
- opportunityId matches
- eventType matches Business Line revenue trigger
- status = CONFIRMED or PAID
```

**Example Scenarios:**

✅ **NOT Flagged:**
```
Opportunity: Stage = Gagné
VALUE_EVENT: SIGNED_PROJECT, CONFIRMED
→ Integrity OK
```

⚠️ **Flagged:**
```
Opportunity: Stage = Gagné
VALUE_EVENT: SIGNED_PROJECT, PENDING
→ Flagged (PENDING doesn't count)
```

⚠️ **Flagged:**
```
Opportunity: Stage = Gagné
VALUE_EVENT: None
→ Flagged (no economic event)
```

### Purpose

**Quality Control:** Ensures commercial truth (Gagné) aligns with economic truth (confirmed VALUE_EVENT).

**Action:** Review flagged opportunities and either:
1. Create missing VALUE_EVENT if revenue was generated
2. Update existing PENDING event to CONFIRMED
3. Verify opportunity should actually be Gagné

---

## COMMON SCENARIOS

### Scenario 1: PAUL RDV Flow

```
1. Lilian schedules RDV with prospect
2. RDV meets eligibility criteria
3. Opportunity → Stage = "Gagné"
4. Navigate to opportunity detail
5. Click "Enregistrer la valeur"
6. Form shows:
   - Date: RDV date
   - Status: En attente (default)
   - Amount: 100 € (pre-filled)
7. User changes status to "Confirmé" (if partner already validated)
8. Submit
9. Revenue Partner: +100 €
10. Integrity KPI: No flag (qualifying event exists)
```

---

### Scenario 2: CALYMIA Subscription

```
1. Client starts trial
2. Opportunity → Stage = "Gagné"
3. Navigate to opportunity detail
4. Click "Enregistrer la valeur"
5. Form shows:
   - Plan selector: Choose "Pro"
   - Amount: 59 € (auto-set)
   - Status: En attente (default)
   - Date: Trial start date
6. Submit (leave as PENDING during trial)
7. MRR: 0 € (PENDING excluded)
8. Integrity KPI: +1 flagged

--- Later, client converts ---

9. Click "Modifier" on VALUE_EVENT
10. Change status to "Confirmé"
11. Submit
12. MRR: +59 €
13. Integrity KPI: -1 (flag removed)
```

---

### Scenario 3: KLS3 Notaires Project

```
1. Project signed with client
2. Opportunity → Stage = "Gagné"
3. Navigate to opportunity detail
4. Click "Enregistrer la valeur"
5. Form shows:
   - Date: Signature date
   - Status: En attente
   - Amount: (manual entry)
6. Enter 12 000 €
7. Change status to "Confirmé"
8. Submit
9. Revenue KLS3: +12 000 €
10. Integrity KPI: No flag

--- Later, client cancels ---

11. Click "Modifier" on VALUE_EVENT
12. Change status to "Annulé"
13. Submit
14. Revenue KLS3: -12 000 €
15. Integrity KPI: +1 flagged
```

---

### Scenario 4: Duplicate Protection (LEVERIO)

```
1. LEVERIO opportunity has SIGNED_DEAL, CONFIRMED, 1 000 €
2. User tries to create another VALUE_EVENT
3. Click "Enregistrer la valeur"
4. Button NOT visible (duplicate protection)
5. Warning message:
   "Un événement économique actif existe déjà pour cette opportunité"

--- To create another, must cancel first ---

6. Click "Modifier" on existing event
7. Change status to "Annulé"
8. Submit
9. "Enregistrer la valeur" button reappears
10. Can now create new VALUE_EVENT
```

---

## TROUBLESHOOTING

### Q: I moved an opportunity to "Gagné" but revenue didn't change. Why?

**A:** Commercial truth (Gagné) does NOT automatically create revenue. You must explicitly register a VALUE_EVENT with status CONFIRMED or PAID.

**Action:**
1. Open opportunity detail
2. Click "Enregistrer la valeur"
3. Fill form and set status to "Confirmé"
4. Submit

---

### Q: I created a VALUE_EVENT but it's not counting toward revenue. Why?

**A:** Check the status. Only CONFIRMED and PAID count toward revenue.

**Action:**
1. Check "Valeur économique" history
2. If status is "En attente", click "Modifier"
3. Change to "Confirmé"
4. Submit

---

### Q: Why can't I create another VALUE_EVENT for this opportunity?

**A:** Duplicate protection is active for LEVERIO, CALYMIA, and KLS3_NOTAIRES.

**Action:**
- If you need to replace the event:
  1. Edit existing event → Change to "Annulé"
  2. Create new event
- If you need to update the event:
  1. Click "Modifier" on existing event
  2. Update fields (status, amount, date)

---

### Q: The "Gagnés sans valeur enregistrée" KPI shows a count. What should I do?

**A:** Review each flagged opportunity:

1. Navigate to Dashboard → "À surveiller" → Click count
2. For each Gagné opportunity without CONFIRMED/PAID VALUE_EVENT:
   - **If revenue was generated:** Create or update VALUE_EVENT
   - **If still pending:** Leave as PENDING until confirmed
   - **If opportunity incorrect:** Update opportunity stage

---

### Q: Can I change the Business Line of a VALUE_EVENT?

**A:** No. Event type and revenue type are determined by Business Line and cannot be edited.

**Workaround:**
1. Cancel existing VALUE_EVENT (status → Annulé)
2. If needed, update opportunity Business Line
3. Create new VALUE_EVENT with correct Business Line

---

### Q: How do I track CALYMIA subscription cancellations?

**A:** Phase 9 limitation: Cancellations reduce MRR by changing status.

**Action:**
1. Click "Modifier" on subscription VALUE_EVENT
2. Change status to "Annulé"
3. Submit
4. MRR decreases by subscription amount

**Note:** Phase 10 may add subscription end dates and churn tracking.

---

### Q: Can I create multiple RDVs for the same PAUL opportunity?

**A:** Yes! PAUL is the only Business Line that allows multiple VALUE_EVENTS per opportunity.

**Use Case:** Multiple paid meetings with same client over time.

---

### Q: What happens if I edit the amount of a CONFIRMED event?

**A:** Revenue KPIs update automatically to reflect the new amount.

**Example:**
```
Before: CONFIRMED, 10 000 € → Revenue: 10 000 €
Edit to: CONFIRMED, 12 000 € → Revenue: 12 000 €
Delta: +2 000 €
```

---

## BEST PRACTICES

### 1. Conservative Recording

✅ **DO:** Create VALUE_EVENT as PENDING when outcome uncertain
✅ **DO:** Update to CONFIRMED only when economically validated
❌ **DON'T:** Default to CONFIRMED without verification

### 2. Timely Updates

✅ **DO:** Update PENDING events to CONFIRMED promptly
✅ **DO:** Monitor integrity KPI regularly
❌ **DON'T:** Leave events in PENDING indefinitely

### 3. Accurate Amounts

✅ **DO:** Enter exact commission/project amounts
✅ **DO:** Update amounts if contract changes
❌ **DON'T:** Use placeholder amounts

### 4. Clear Notes

✅ **DO:** Add context in notes field (contract reference, payment terms)
✅ **DO:** Document cancellation reasons
❌ **DON'T:** Leave notes empty for complex transactions

### 5. Integrity Monitoring

✅ **DO:** Review "Gagnés sans valeur enregistrée" weekly
✅ **DO:** Investigate all flagged opportunities
❌ **DON'T:** Ignore integrity warnings

---

## TECHNICAL NOTES

### Server-Side Security

- Event type and revenue type derived server-side from Business Line
- Client cannot manipulate technical fields
- Amount and status validated server-side

### Revalidation

After creating or updating VALUE_EVENT:
- Opportunity detail refreshes automatically
- Dashboard KPIs update via Next.js revalidation
- Analytics refresh (if applicable)

### No Schema Changes Required

Phase 9 uses existing VALUE_EVENTS table. All fields already present in Airtable schema.

---

**END OF ECONOMIC EVENTS GUIDE**

For technical implementation details, see `PHASE_9A_AUDIT_REPORT.md`.

For product strategy and business logic, see `CLAUDE.md` sections 10-14.
