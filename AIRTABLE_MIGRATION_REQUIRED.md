# AIRTABLE MIGRATION REQUIRED

**Status**: ⚠️  MIGRATIONS REQUIRED BEFORE FULL DEPLOYMENT

**Date**: 2026-09-16

---

## 1. BUSINESS_LINES — Add PROSPECTING mode

### Context

Code now supports `prospectingMode: 'PROSPECTING'` in addition to `'COLD_CALL'` and `'DIRECT_OPPORTUNITY'`.

`PROSPECTING` is the new, proper value for business lines using multi-channel prospecting.

`COLD_CALL` is kept for backward compatibility.

### Migration Required

**Table**: `BUSINESS_LINES`

**Field**: `Prospecting Mode` (Single Select)

**Action**: Add new option

#### Steps:

1. Open Airtable base
2. Open table `BUSINESS_LINES`
3. Click on field `Prospecting Mode` configuration
4. Add new option: `PROSPECTING`
5. (Optional) Keep `COLD_CALL` for backward compatibility

#### Result:

Available options should be:
- `PROSPECTING` (new, recommended)
- `COLD_CALL` (legacy, backward compatible)
- `DIRECT_OPPORTUNITY` (existing)

### Business Lines to Update

After adding the option, update existing business lines:

| Business Line | Current Mode | New Mode (recommended) |
|---------------|--------------|------------------------|
| Paul | `COLD_CALL` | `PROSPECTING` |
| Sacha | `COLD_CALL` | `PROSPECTING` |
| Calymia | `COLD_CALL` | `PROSPECTING` |
| KLS3 Notaires | `COLD_CALL` | `PROSPECTING` |

**Note**: This update is OPTIONAL. Code will work with both `COLD_CALL` and `PROSPECTING`.

---

## 2. COLD_CALL_TARGETS — Add 'Converti' option (REQUIRED FOR EMAIL_REPLY)

### Context

Code now writes `'Converti'` directly to Airtable (not `'RDV booké'`).

**Semantic issue** :
- Domain: `'Converti'` = "converted to Opportunity" (generic, multi-channel)
- Airtable legacy: `'RDV booké'` = "meeting booked" (specific to MEETING_BOOKED only)

**Problem** : Writing `'Converti'` as `'RDV booké'` is SEMANTICALLY FALSE
- EMAIL_REPLY → Converti → ❌ NOT "RDV booké" (no meeting!)
- CONVERSATION → Converti → ❌ NOT "RDV booké" (no meeting!)
- MEETING_BOOKED → Converti → ✅ YES "RDV booké" (actual meeting)

**Solution** : Add `'Converti'` as a separate option in Airtable Single Select

### Migration Required

**Table**: `COLD_CALL_TARGETS`

**Field**: `Call Status` (Single Select)

**Action**: Add new option `Converti`

#### Steps:

1. Open Airtable base
2. Open table `COLD_CALL_TARGETS`
3. Click on field `Call Status` configuration
4. Add new option: `Converti`
5. Keep `RDV booké` for backward compatibility (optional: can be removed later)

#### Result:

Available options should include:
- `À appeler` (legacy)
- `À rappeler` (legacy)
- `Email Flow` (legacy)
- `Mauvais numéro` (legacy)
- `Pas intéressé` (legacy)
- `RDV booké` (legacy, can coexist temporarily)
- `Converti` (NEW, **REQUIRED**)

**Status**: ⚠️  **REQUIRED** (code will write `'Converti'` directly)

**Priority**: **HIGH** (blocks EMAIL_REPLY feature)

---

## 3. COLD_CALL_TARGETS — Rename Call Status values (OPTIONAL)

### Context

Code now uses domain statuses:
- `'À contacter'` (instead of `'À appeler'`)
- `'Relance prévue'` (instead of `'À rappeler'`)
- `'En séquence'` (instead of `'Email Flow'`)
- `'Non joignable'` (instead of `'Mauvais numéro'`)
- `'Hors cible'` (instead of `'Pas intéressé'`)
- `'Converti'` (instead of `'RDV booké'`)

**CURRENT STATE**: Code uses `mapProspectingToLegacy()` to write old values to Airtable.

**Reading and writing works correctly** without Airtable migration.

### Migration (OPTIONAL, for cleaner data)

**Table**: `COLD_CALL_TARGETS`

**Field**: `Call Status` (Single Select)

**Action**: Rename options

#### Steps:

1. Open Airtable base
2. Open table `COLD_CALL_TARGETS`
3. Click on field `Call Status` configuration
4. Rename options (Airtable will update all existing records automatically):

| Old value | New value |
|-----------|-----------|
| `À appeler` | `À contacter` |
| `À rappeler` | `Relance prévue` |
| `Email Flow` | `En séquence` |
| `Mauvais numéro` | `Non joignable` |
| `Pas intéressé` | `Hors cible` |
| `RDV booké` | `Converti` |

5. Save changes

#### After migration:

Update code to remove mapping layer:

**File**: `/lib/prospecting/status-mapper.ts`

**Change**:
```typescript
// Before:
export function mapProspectingToLegacy(status: ProspectingStatus): LegacyCallStatus {
  switch (status) {
    case 'À contacter': return 'À appeler'
    // ... etc
  }
}

// After:
export function mapProspectingToLegacy(status: ProspectingStatus): string {
  return status // No mapping needed anymore
}
```

**File**: `/lib/prospecting/status-mapper.ts`

**Change**:
```typescript
// Before:
export function mapLegacyToProspecting(legacyStatus: string): ProspectingStatus {
  switch (legacyStatus) {
    case 'À appeler': return 'À contacter'
    // ... etc
  }
}

// After:
export function mapLegacyToProspecting(status: string): ProspectingStatus {
  return status as ProspectingStatus // No mapping needed anymore
}
```

**Status**: ⏸️  DEFERRED (not required for V1)

---

## 4. CALL_STATUS_HISTORY — Add 'Converti' option (REQUIRED)

Same as section 2, but for fields:
- `From Status`
- `To Status`

**Action**: Add `Converti` to both Single Select fields

**Status**: ⚠️  **REQUIRED**

**Priority**: **HIGH**

---

## 5. CALL_STATUS_HISTORY — Rename other values (OPTIONAL)

Same migration as section 2, but for fields:
- `From Status`
- `To Status`

**Status**: ⏸️  DEFERRED (not required for V1)

---

## SUMMARY

### Required before EMAIL_REPLY feature works:

1. ⚠️  **HIGH PRIORITY**: Add `Converti` option to `COLD_CALL_TARGETS.Call Status`
2. ⚠️  **HIGH PRIORITY**: Add `Converti` option to `CALL_STATUS_HISTORY.From Status` and `To Status`

### Recommended (not blocking):

3. ✅ Add `PROSPECTING` option to `BUSINESS_LINES.Prospecting Mode`

### Optional (cleaner data, but not required):

4. ⏸️  Rename other `COLD_CALL_TARGETS.Call Status` options
5. ⏸️  Update business lines from `COLD_CALL` to `PROSPECTING`
6. ⏸️  Rename `CALL_STATUS_HISTORY` status options

### Current code compatibility:

- ✅ Works with `COLD_CALL` or `PROSPECTING` mode
- ✅ Works with old status values (`'À appeler'`, etc.)
- ✅ Works with new status values (`'À contacter'`, etc.)
- ✅ Backward compatible

---

**Recommendation**:

1. Add `PROSPECTING` option to Airtable (5 minutes)
2. Deploy code to production
3. Test with real usage for 1-2 weeks
4. Optionally clean up Airtable values later
