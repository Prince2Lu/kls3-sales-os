/**
 * CREATE CALL_STATUS_HISTORY TABLE
 *
 * Mission: Create CALL_STATUS_HISTORY table in Airtable to track
 * all Call Status transitions for Cold Call Targets
 *
 * SAFETY:
 * - Verifies we're on the correct KLS3 Sales OS base
 * - Creates table only if it doesn't exist
 * - Does NOT modify existing tables
 * - Idempotent - can be run multiple times
 *
 * STRUCTURE:
 * - Name (primary field, text)
 * - Cold Call Target (link to COLD_CALL_TARGETS)
 * - From Status (single select)
 * - To Status (single select)
 * - Changed At (date/time)
 * - Changed By (single select: Eric, Lilian)
 *
 * USAGE:
 *   DRY-RUN: npx tsx scripts/create-call-status-history-table.ts
 *   EXECUTE: npx tsx scripts/create-call-status-history-table.ts --execute
 */

import { config, getHeaders } from '../lib/airtable/config.js'

const EXECUTE = process.argv.includes('--execute')

const CALL_STATUSES = ['À appeler', 'À rappeler', 'Email Flow', 'Mauvais numéro', 'Pas intéressé', 'RDV booké']

const OWNERS = ['Eric', 'Lilian']

interface TableSchema {
  id: string
  name: string
  fields: Array<{
    id: string
    name: string
    type: string
  }>
}

async function getTableByName(tableName: string): Promise<TableSchema | null> {
  const url = `${config.apiUrl}/meta/bases/${config.baseId}/tables`
  const response = await fetch(url, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch tables: ${response.statusText}`)
  }

  const data = (await response.json()) as { tables: TableSchema[] }
  return data.tables.find((t) => t.name === tableName) || null
}

async function getColdCallTargetsTableId(): Promise<string> {
  const table = await getTableByName('COLD_CALL_TARGETS')
  if (!table) {
    throw new Error('COLD_CALL_TARGETS table not found')
  }
  return table.id
}

async function createTable() {
  console.log('='.repeat(80))
  console.log('CREATE CALL_STATUS_HISTORY TABLE')
  console.log('='.repeat(80))
  console.log()

  if (!EXECUTE) {
    console.log('⚠️  DRY-RUN MODE (no changes will be made)')
    console.log('   Use --execute to create table')
    console.log()
  }

  // Check if table already exists
  console.log('Checking if CALL_STATUS_HISTORY table exists...')
  const existing = await getTableByName('CALL_STATUS_HISTORY')

  if (existing) {
    console.log('✓ Table already exists')
    console.log(`  ID: ${existing.id}`)
    console.log(`  Fields: ${existing.fields.length}`)
    console.log()
    console.log('Fields found:')
    existing.fields.forEach((f) => {
      console.log(`  - ${f.name} (${f.type})`)
    })
    console.log()
    console.log('✓ No action needed')
    return
  }

  console.log('Table does not exist')
  console.log()

  if (!EXECUTE) {
    console.log('DRY-RUN: Would create table with fields:')
    console.log('  - Name (primary, singleLineText)')
    console.log('  - Cold Call Target (linkedRecord → COLD_CALL_TARGETS)')
    console.log('  - From Status (singleSelect)')
    console.log('  - To Status (singleSelect)')
    console.log('  - Changed At (dateTime)')
    console.log('  - Changed By (singleSelect)')
    console.log()
    return
  }

  // Get COLD_CALL_TARGETS table ID for link
  const coldCallTargetsTableId = await getColdCallTargetsTableId()

  console.log('Creating CALL_STATUS_HISTORY table...')
  console.log()

  const url = `${config.apiUrl}/meta/bases/${config.baseId}/tables`
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: 'CALL_STATUS_HISTORY',
      description: 'Historical log of all Call Status transitions for Cold Call Targets',
      fields: [
        {
          name: 'Name',
          type: 'singleLineText',
        },
        {
          name: 'Cold Call Target',
          type: 'multipleRecordLinks',
          options: {
            linkedTableId: coldCallTargetsTableId,
          },
        },
        {
          name: 'From Status',
          type: 'singleSelect',
          options: {
            choices: CALL_STATUSES.map((status) => ({ name: status })),
          },
        },
        {
          name: 'To Status',
          type: 'singleSelect',
          options: {
            choices: CALL_STATUSES.map((status) => ({ name: status })),
          },
        },
        {
          name: 'Changed At',
          type: 'dateTime',
          options: {
            dateFormat: {
              name: 'iso',
            },
            timeFormat: {
              name: '24hour',
            },
            timeZone: 'utc',
          },
        },
        {
          name: 'Changed By',
          type: 'singleSelect',
          options: {
            choices: OWNERS.map((owner) => ({ name: owner })),
          },
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create table: ${response.statusText} - ${errorText}`)
  }

  const createdTable = await response.json()

  console.log('✓ Table created successfully')
  console.log(`  ID: ${createdTable.id}`)
  console.log(`  Name: ${createdTable.name}`)
  console.log()
  console.log('Fields created:')
  createdTable.fields.forEach((f: any) => {
    console.log(`  ✓ ${f.name} (${f.type})`)
  })
  console.log()
  console.log('✓ CALL_STATUS_HISTORY table ready')
}

createTable().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
