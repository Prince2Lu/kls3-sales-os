/**
 * VERIFY AIRTABLE BASE STRUCTURE
 *
 * Safety check before any schema modification
 * Verifies we're connected to the correct KLS3 Sales OS base
 */

import { config, getTableUrl, getHeaders } from '../lib/airtable/config.js'

const EXPECTED_TABLES = [
  'BUSINESS_LINES',
  'COMPANIES',
  'CONTACTS',
  'OPPORTUNITIES',
  'ACTIVITIES',
  'TASKS',
  'VALUE_EVENTS',
  'GOALS',
  'STAGE_HISTORY',
  'USERS',
  'COLD_CALL_TARGETS',
]

async function main() {
  console.log('='.repeat(80))
  console.log('VERIFYING AIRTABLE BASE STRUCTURE')
  console.log('='.repeat(80))
  console.log()

  const baseId = config.baseId
  console.log(`Base ID: ${baseId.substring(0, 8)}...`)
  console.log()

  // Fetch base schema
  const url = `${config.apiUrl}/meta/bases/${baseId}/tables`
  const response = await fetch(url, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch base schema: ${response.statusText}`)
  }

  const data = (await response.json()) as { tables: Array<{ id: string; name: string }> }
  const foundTables = data.tables.map((t) => t.name)

  console.log(`Found ${foundTables.length} tables in base:`)
  foundTables.forEach((name) => {
    const expected = EXPECTED_TABLES.includes(name)
    console.log(`  ${expected ? '✓' : '?'} ${name}`)
  })
  console.log()

  // Verify all expected tables exist
  const missing = EXPECTED_TABLES.filter((t) => !foundTables.includes(t))
  if (missing.length > 0) {
    console.error('❌ SAFETY CHECK FAILED')
    console.error('Missing expected tables:', missing)
    throw new Error('Base structure does not match KLS3 Sales OS expected schema')
  }

  console.log('✓ All expected tables found')
  console.log('✓ Base structure verified - safe to proceed')
  console.log()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
