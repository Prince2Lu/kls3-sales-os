/**
 * MIGRATE PROSPECTING MODE FIELD
 *
 * Complete migration script that:
 * 1. Checks if field exists in BUSINESS_LINES
 * 2. Creates field if needed (Single select with COLD_CALL, DIRECT_OPPORTUNITY)
 * 3. Configures all 4 Business Lines
 * 4. Verifies final state
 *
 * IDEMPOTENT: Can be run multiple times safely
 *
 * USAGE:
 *   DRY-RUN: npx tsx scripts/migrate-prospecting-mode.ts
 *   EXECUTE: npx tsx scripts/migrate-prospecting-mode.ts --execute
 */

import { config, getHeaders } from '../lib/airtable/config.js'

const EXECUTE = process.argv.includes('--execute')

interface TableSchema {
  id: string
  name: string
  fields: Array<{
    id: string
    name: string
    type: string
    options?: {
      choices?: Array<{ id: string; name: string; color?: string }>
    }
  }>
}

interface BusinessLineRecord {
  id: string
  fields: {
    Name: string
    Code: string
    'Prospecting Mode'?: string
  }
}

async function getTableSchema(tableIdOrName: string): Promise<TableSchema> {
  const url = `${config.apiUrl}/meta/bases/${config.baseId}/tables`
  const response = await fetch(url, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch table schema: ${response.statusText}`)
  }

  const data = (await response.json()) as { tables: TableSchema[] }
  const table = data.tables.find((t) => t.name === tableIdOrName || t.id === tableIdOrName)

  if (!table) {
    throw new Error(`Table not found: ${tableIdOrName}`)
  }

  return table
}

async function createFieldIfNeeded(tableId: string, tableName: string) {
  console.log('Checking if Prospecting Mode field exists...')

  const schema = await getTableSchema(tableName)
  const field = schema.fields.find((f) => f.name === 'Prospecting Mode')

  if (field) {
    console.log('✓ Field already exists')
    console.log(`  Type: ${field.type}`)

    // Verify it's a Single Select with correct options
    if (field.type !== 'singleSelect') {
      throw new Error(
        `Field exists but has wrong type: ${field.type} (expected singleSelect)`
      )
    }

    const choices = field.options?.choices?.map((c) => c.name) || []
    console.log(`  Choices: ${choices.join(', ')}`)

    const requiredChoices = ['COLD_CALL', 'DIRECT_OPPORTUNITY']
    const missingChoices = requiredChoices.filter((c) => !choices.includes(c))

    if (missingChoices.length > 0) {
      console.log(`⚠️  Missing choices: ${missingChoices.join(', ')}`)
      console.log('Note: Airtable API does not support adding choices to existing fields')
      console.log('Please add these choices manually in Airtable UI if needed')
    } else {
      console.log('✓ All required choices present')
    }

    console.log()
    return
  }

  console.log('Field does not exist - needs to be created')
  console.log()

  if (!EXECUTE) {
    console.log('DRY-RUN: Would create field with:')
    console.log('  Name: Prospecting Mode')
    console.log('  Type: singleSelect')
    console.log('  Choices: COLD_CALL, DIRECT_OPPORTUNITY')
    console.log()
    return
  }

  // Create field via Airtable API
  console.log('Creating Prospecting Mode field...')

  const createUrl = `${config.apiUrl}/meta/bases/${config.baseId}/tables/${tableId}/fields`
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: 'Prospecting Mode',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'COLD_CALL' },
          { name: 'DIRECT_OPPORTUNITY' },
        ],
      },
    }),
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    throw new Error(`Failed to create field: ${createResponse.statusText} - ${errorText}`)
  }

  console.log('✓ Field created successfully')
  console.log()
}

async function configureBusinessLines() {
  console.log('Fetching BUSINESS_LINES records...')

  const url = `${config.apiUrl}/${config.baseId}/BUSINESS_LINES`
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
  const updates: Array<{
    id: string
    name: string
    code: string
    current: string | undefined
    target: string
  }> = []

  console.log('Current state:')
  for (const record of records) {
    const code = record.fields.Code
    const current = record.fields['Prospecting Mode']
    const target = prospectingModeConfig[code]

    if (!target) {
      console.log(`  ⚠️  ${record.fields.Name} (${code}): No configuration defined`)
      continue
    }

    if (current === target) {
      console.log(`  ✓ ${record.fields.Name} (${code}): ${target}`)
    } else {
      console.log(`  → ${record.fields.Name} (${code}): ${current || 'EMPTY'} → ${target}`)
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
  console.log(`Updates needed: ${updates.length}`)
  console.log()

  if (updates.length === 0) {
    console.log('✓ All Business Lines already configured correctly')
    return
  }

  if (!EXECUTE) {
    console.log('DRY-RUN: Would update:')
    updates.forEach((u) => {
      console.log(`  - ${u.name} (${u.code}): ${u.current || 'EMPTY'} → ${u.target}`)
    })
    console.log()
    return
  }

  // Execute updates
  console.log('Applying updates...')

  for (const update of updates) {
    try {
      const patchUrl = `${config.apiUrl}/${config.baseId}/BUSINESS_LINES/${update.id}`
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
        const errorText = await patchResponse.text()
        throw new Error(`Failed to update ${update.code}: ${patchResponse.statusText} - ${errorText}`)
      }

      console.log(`  ✓ ${update.name} (${update.code}) → ${update.target}`)
    } catch (error) {
      console.error(`  ✗ Failed to update ${update.code}:`, error)
      throw error
    }
  }

  console.log()
  console.log('✓ Configuration applied')
  console.log()
}

async function verifyFinalState() {
  console.log('Verifying final state...')

  const url = `${config.apiUrl}/${config.baseId}/BUSINESS_LINES`
  const response = await fetch(url, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch BUSINESS_LINES: ${response.statusText}`)
  }

  const data = (await response.json()) as { records: BusinessLineRecord[] }
  const records = data.records

  console.log()
  console.log('Final state:')
  console.log()

  records
    .filter((r) => ['PAUL', 'SACHA', 'CALYMIA', 'KLS3_NOTAIRES'].includes(r.fields.Code))
    .forEach((record) => {
      console.log(`  ${record.fields.Name}`)
      console.log(`    Code: ${record.fields.Code}`)
      console.log(`    Prospecting Mode: ${record.fields['Prospecting Mode'] || 'NOT SET'}`)
      console.log()
    })
}

async function main() {
  console.log('='.repeat(80))
  console.log('PROSPECTING MODE MIGRATION')
  console.log('='.repeat(80))
  console.log()

  if (!EXECUTE) {
    console.log('⚠️  DRY-RUN MODE (no changes will be made)')
    console.log('   Use --execute to apply changes')
    console.log()
  } else {
    console.log('🚀 EXECUTION MODE - Changes will be applied')
    console.log()
  }

  // Step 1: Get table schema and create field if needed
  const schema = await getTableSchema('BUSINESS_LINES')
  await createFieldIfNeeded(schema.id, schema.name)

  // Step 2: Configure Business Lines
  await configureBusinessLines()

  // Step 3: Verify final state
  await verifyFinalState()

  console.log('='.repeat(80))
  console.log('✓ MIGRATION COMPLETE')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
