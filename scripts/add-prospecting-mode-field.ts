/**
 * ADD PROSPECTING MODE FIELD TO BUSINESS_LINES
 *
 * Mission: Add new "Prospecting Mode" field to BUSINESS_LINES table
 * and configure initial values
 *
 * SAFETY:
 * - Validates BUSINESS_LINES table exists
 * - Validates all 4 expected business lines exist
 * - Does NOT modify existing fields
 * - Does NOT delete any data
 *
 * CONFIGURATION:
 * PAUL → COLD_CALL
 * SACHA → COLD_CALL
 * CALYMIA → DIRECT_OPPORTUNITY
 * KLS3_NOTAIRES → DIRECT_OPPORTUNITY
 *
 * USAGE:
 *   DRY-RUN: npx tsx scripts/add-prospecting-mode-field.ts
 *   EXECUTE: npx tsx scripts/add-prospecting-mode-field.ts --execute
 */

import { getTableUrl, getHeaders } from '../lib/airtable/config.js'

const EXECUTE = process.argv.includes('--execute')

interface BusinessLineRecord {
  id: string
  fields: {
    Name: string
    Code: string
    'Prospecting Mode'?: string
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('ADD PROSPECTING MODE FIELD')
  console.log('='.repeat(80))
  console.log()

  if (!EXECUTE) {
    console.log('⚠️  DRY-RUN MODE (no changes will be made)')
    console.log('   Use --execute to apply changes')
    console.log()
  }

  // Fetch current Business Lines
  console.log('Fetching BUSINESS_LINES...')
  const url = getTableUrl('BUSINESS_LINES')
  const response = await fetch(url, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch BUSINESS_LINES: ${response.statusText}`)
  }

  const data = (await response.json()) as { records: BusinessLineRecord[] }
  const records = data.records

  console.log(`Found ${records.length} Business Lines`)
  console.log()

  // Validate expected business lines
  const expectedCodes = ['PAUL', 'SACHA', 'CALYMIA', 'KLS3_NOTAIRES']
  const foundCodes = records.map((r) => r.fields.Code)

  for (const code of expectedCodes) {
    if (!foundCodes.includes(code)) {
      throw new Error(`Expected Business Line not found: ${code}`)
    }
  }

  console.log('✓ All expected Business Lines found')
  console.log()

  // Configuration mapping
  const prospectingModeConfig: Record<string, 'COLD_CALL' | 'DIRECT_OPPORTUNITY'> = {
    PAUL: 'COLD_CALL',
    SACHA: 'COLD_CALL',
    CALYMIA: 'DIRECT_OPPORTUNITY',
    KLS3_NOTAIRES: 'DIRECT_OPPORTUNITY',
  }

  // Check current state and plan updates
  const updates: Array<{ id: string; name: string; code: string; current: string | undefined; target: string }> = []

  for (const record of records) {
    const code = record.fields.Code
    const current = record.fields['Prospecting Mode']
    const target = prospectingModeConfig[code]

    if (!target) {
      console.log(`⚠️  Skipping ${code} (no configuration defined)`)
      continue
    }

    if (current === target) {
      console.log(`✓ ${record.fields.Name} (${code}): Already set to ${target}`)
    } else {
      console.log(`→ ${record.fields.Name} (${code}): ${current || 'EMPTY'} → ${target}`)
      updates.push({
        id: record.id,
        name: record.fields.Name,
        code: record.fields.Code,
        current,
        target,
      })
    }
  }

  console.log()
  console.log(`Total updates needed: ${updates.length}`)
  console.log()

  if (updates.length === 0) {
    console.log('✓ No updates needed - all Business Lines already configured')
    return
  }

  if (!EXECUTE) {
    console.log('DRY-RUN: Would update the following records:')
    updates.forEach((u) => {
      console.log(`  - ${u.name} (${u.code}): ${u.current || 'EMPTY'} → ${u.target}`)
    })
    console.log()
    console.log('Run with --execute to apply changes')
    return
  }

  // Execute updates
  console.log('Executing updates...')
  console.log()

  for (const update of updates) {
    try {
      const patchUrl = `${getTableUrl('BUSINESS_LINES')}/${update.id}`
      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          fields: {
            'Prospecting Mode': update.target,
          },
        }),
      })

      if (!patchResponse.ok) {
        throw new Error(`Failed to update ${update.code}: ${patchResponse.statusText}`)
      }

      console.log(`✓ Updated ${update.name} (${update.code}) → ${update.target}`)
    } catch (error) {
      console.error(`✗ Failed to update ${update.code}:`, error)
    }
  }

  console.log()
  console.log('✓ Prospecting Mode field configuration complete')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
