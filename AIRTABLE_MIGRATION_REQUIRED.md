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

## 2. COLD_CALL_TARGETS — Rename Call Status values (OPTIONAL)

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

## 3. CALL_STATUS_HISTORY — Same as COLD_CALL_TARGETS (OPTIONAL)

Same migration as section 2, but for fields:
- `From Status`
- `To Status`

**Status**: ⏸️  DEFERRED (not required for V1)

---

## SUMMARY

### Required before production:

1. ✅ Add `PROSPECTING` option to `BUSINESS_LINES.Prospecting Mode`

### Optional (cleaner data, but not required):

2. ⏸️  Rename `COLD_CALL_TARGETS.Call Status` options
3. ⏸️  Update business lines from `COLD_CALL` to `PROSPECTING`
4. ⏸️  Rename `CALL_STATUS_HISTORY` status options

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
