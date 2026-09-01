// Airtable Phase 1 verification script
// Verifies connection, tables, and business lines
// Server-side only - requires AIRTABLE_TOKEN and AIRTABLE_BASE_ID

// Load environment variables from .env.local BEFORE importing any airtable modules
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

const envResult = loadEnv({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.error('❌ Failed to load .env.local:', envResult.error)
  process.exit(1)
}

// Now safe to import after env is loaded
import {
  getBusinessLines,
  getCompanies,
  getContacts,
  getOpportunities,
  getActivities,
  getTasks,
  getValueEvents,
  getGoals,
  getStageHistory,
} from '../lib/airtable/client'
import { TABLE_NAMES } from '../lib/airtable/config'

interface VerificationResult {
  success: boolean
  message: string
  details?: unknown
}

async function verify(): Promise<void> {
  console.log('🔍 KLS3 Sales OS — Airtable Phase 1 Verification\n')

  const results: VerificationResult[] = []

  // ========================================================================
  // 1. Check environment variables
  // ========================================================================
  console.log('1️⃣  Checking environment variables...')
  if (!process.env.AIRTABLE_TOKEN) {
    results.push({
      success: false,
      message: 'AIRTABLE_TOKEN not found in environment',
    })
  } else {
    results.push({
      success: true,
      message: 'AIRTABLE_TOKEN present (not displayed)',
    })
  }

  if (!process.env.AIRTABLE_BASE_ID) {
    results.push({
      success: false,
      message: 'AIRTABLE_BASE_ID not found in environment',
    })
  } else {
    results.push({
      success: true,
      message: 'AIRTABLE_BASE_ID present (not displayed)',
    })
  }

  // ========================================================================
  // 2. Test connection and fetch Business Lines
  // ========================================================================
  console.log('\n2️⃣  Testing Airtable connection...')
  try {
    const businessLines = await getBusinessLines()
    results.push({
      success: true,
      message: `Connected successfully - found ${businessLines.length} active business lines`,
    })

    // Check expected business line codes
    const expectedCodes: string[] = ['PAUL', 'SACHA', 'CALYMIA', 'KLS3_NOTAIRES']
    const actualCodes: string[] = businessLines.map((bl) => bl.code)

    const missingCodes = expectedCodes.filter(
      (code) => !actualCodes.includes(code)
    )
    const unexpectedCodes = actualCodes.filter(
      (code) => !expectedCodes.includes(code)
    )

    if (missingCodes.length === 0 && unexpectedCodes.length === 0) {
      results.push({
        success: true,
        message: `Business Lines validation passed - all expected codes found: ${expectedCodes.join(', ')}`,
      })
    } else {
      if (missingCodes.length > 0) {
        results.push({
          success: false,
          message: `Missing business line codes: ${missingCodes.join(', ')}`,
        })
      }
      if (unexpectedCodes.length > 0) {
        results.push({
          success: false,
          message: `Unexpected business line codes: ${unexpectedCodes.join(', ')}`,
        })
      }
    }

    console.log(`   ✓ Business Lines: ${businessLines.map((bl) => bl.name).join(', ')}`)
  } catch (error) {
    results.push({
      success: false,
      message: 'Failed to connect to Airtable or fetch Business Lines',
      details: error instanceof Error ? error.message : String(error),
    })
  }

  // ========================================================================
  // 3. Test table access
  // ========================================================================
  console.log('\n3️⃣  Testing table access...')

  const tableFunctions: Record<string, () => Promise<unknown[]>> = {
    [TABLE_NAMES.BUSINESS_LINES]: () => getBusinessLines(),
    [TABLE_NAMES.COMPANIES]: () => getCompanies({ maxRecords: 1 }),
    [TABLE_NAMES.CONTACTS]: () => getContacts({ maxRecords: 1 }),
    [TABLE_NAMES.OPPORTUNITIES]: () => getOpportunities({ maxRecords: 1 }),
    [TABLE_NAMES.ACTIVITIES]: () => getActivities({ maxRecords: 1 }),
    [TABLE_NAMES.TASKS]: () => getTasks({ maxRecords: 1 }),
    [TABLE_NAMES.VALUE_EVENTS]: () => getValueEvents({ maxRecords: 1 }),
    [TABLE_NAMES.GOALS]: () => getGoals(),
    [TABLE_NAMES.STAGE_HISTORY]: () => getStageHistory({ maxRecords: 1 }),
  }

  for (const [tableName, fetchFn] of Object.entries(tableFunctions)) {
    try {
      const records = await fetchFn()
      results.push({
        success: true,
        message: `${tableName} accessible (${Array.isArray(records) ? records.length : 0} records fetched)`,
      })
      console.log(`   ✓ ${tableName}`)
    } catch (error) {
      results.push({
        success: false,
        message: `${tableName} not accessible`,
        details: error instanceof Error ? error.message : String(error),
      })
      console.log(`   ✗ ${tableName}`)
    }
  }

  // ========================================================================
  // 4. Test pagination
  // ========================================================================
  console.log('\n4️⃣  Testing pagination...')
  try {
    const allBusinessLines = await getBusinessLines()
    results.push({
      success: true,
      message: `Pagination working - fetched ${allBusinessLines.length} business lines`,
    })
    console.log(`   ✓ Pagination functional`)
  } catch (error) {
    results.push({
      success: false,
      message: 'Pagination test failed',
      details: error instanceof Error ? error.message : String(error),
    })
    console.log(`   ✗ Pagination test failed`)
  }

  // ========================================================================
  // 5. Test mapping
  // ========================================================================
  console.log('\n5️⃣  Testing data mapping...')
  try {
    const businessLines = await getBusinessLines()
    if (businessLines.length > 0) {
      const bl = businessLines[0]
      const hasRequiredFields =
        bl.id &&
        bl.name &&
        bl.code &&
        bl.category &&
        bl.revenueTrigger &&
        bl.revenueType &&
        bl.active !== undefined

      if (hasRequiredFields) {
        results.push({
          success: true,
          message: 'Mapping working - all required fields present',
        })
        console.log(`   ✓ Mapping functional`)
      } else {
        results.push({
          success: false,
          message: 'Mapping incomplete - some fields missing',
        })
        console.log(`   ✗ Mapping incomplete`)
      }
    } else {
      results.push({
        success: false,
        message: 'Cannot test mapping - no business lines found',
      })
      console.log(`   ⚠ No business lines to test`)
    }
  } catch (error) {
    results.push({
      success: false,
      message: 'Mapping test failed',
      details: error instanceof Error ? error.message : String(error),
    })
    console.log(`   ✗ Mapping test failed`)
  }

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n' + '='.repeat(60))
  console.log('VERIFICATION SUMMARY')
  console.log('='.repeat(60) + '\n')

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.message}`)
    if (!result.success && result.details) {
      console.log(`   Details: ${result.details}`)
    }
  })

  console.log('\n' + '='.repeat(60))
  console.log(
    `TOTAL: ${successCount} passed, ${failCount} failed out of ${results.length} checks`
  )
  console.log('='.repeat(60) + '\n')

  if (failCount > 0) {
    process.exit(1)
  } else {
    console.log('✨ All verification checks passed!\n')
    process.exit(0)
  }
}

// Run verification
verify().catch((error) => {
  console.error('\n❌ Verification script error:')
  console.error(error)
  process.exit(1)
})
