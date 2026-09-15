/**
 * FIX CALL STATUS OPTIONS
 *
 * Corrects Call Status single select options to match validated funnel:
 * - À appeler
 * - À rappeler
 * - Email Flow
 * - Mauvais numéro
 * - Pas intéressé
 * - RDV booké
 *
 * Removes: Appelé, Hors cible (not in validated funnel)
 * Adds: Mauvais numéro (missing from initial schema)
 */

import { config, getHeaders } from '../lib/airtable/config.js'

const CORRECT_CALL_STATUSES = [
  'À appeler',
  'À rappeler',
  'Email Flow',
  'Mauvais numéro',
  'Pas intéressé',
  'RDV booké',
]

async function getTableSchema(tableName: string) {
  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${config.baseId}/tables`,
    {
      headers: getHeaders(),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.statusText}`)
  }

  const data = await response.json()
  const table = data.tables.find((t: any) => t.name === tableName)

  if (!table) {
    throw new Error(`Table ${tableName} not found`)
  }

  return table
}

async function updateFieldOptions(
  tableId: string,
  fieldId: string,
  choices: string[]
) {
  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${config.baseId}/tables/${tableId}/fields/${fieldId}`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        options: {
          choices: choices.map((name) => ({ name })),
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to update field: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

async function main() {
  console.log('='.repeat(80))
  console.log('FIX CALL STATUS OPTIONS')
  console.log('='.repeat(80))
  console.log()

  console.log('Correct Call Status values:')
  CORRECT_CALL_STATUSES.forEach((status) => {
    console.log(`  - ${status}`)
  })
  console.log()

  // 1. Fix COLD_CALL_TARGETS.Call Status
  console.log('Step 1: Fix COLD_CALL_TARGETS.Call Status')
  console.log('-'.repeat(80))

  const targetsTable = await getTableSchema('COLD_CALL_TARGETS')
  const callStatusField = targetsTable.fields.find(
    (f: any) => f.name === 'Call Status'
  )

  if (!callStatusField) {
    throw new Error('Call Status field not found in COLD_CALL_TARGETS')
  }

  console.log(`  Current options: ${callStatusField.options.choices.map((c: any) => c.name).join(', ')}`)

  await updateFieldOptions(
    targetsTable.id,
    callStatusField.id,
    CORRECT_CALL_STATUSES
  )

  console.log(`  ✓ Updated to: ${CORRECT_CALL_STATUSES.join(', ')}`)
  console.log()

  // 2. Fix CALL_STATUS_HISTORY.From Status
  console.log('Step 2: Fix CALL_STATUS_HISTORY.From Status')
  console.log('-'.repeat(80))

  const historyTable = await getTableSchema('CALL_STATUS_HISTORY')
  const fromStatusField = historyTable.fields.find(
    (f: any) => f.name === 'From Status'
  )

  if (!fromStatusField) {
    throw new Error('From Status field not found in CALL_STATUS_HISTORY')
  }

  console.log(`  Current options: ${fromStatusField.options.choices.map((c: any) => c.name).join(', ')}`)

  await updateFieldOptions(
    historyTable.id,
    fromStatusField.id,
    CORRECT_CALL_STATUSES
  )

  console.log(`  ✓ Updated to: ${CORRECT_CALL_STATUSES.join(', ')}`)
  console.log()

  // 3. Fix CALL_STATUS_HISTORY.To Status
  console.log('Step 3: Fix CALL_STATUS_HISTORY.To Status')
  console.log('-'.repeat(80))

  const toStatusField = historyTable.fields.find(
    (f: any) => f.name === 'To Status'
  )

  if (!toStatusField) {
    throw new Error('To Status field not found in CALL_STATUS_HISTORY')
  }

  console.log(`  Current options: ${toStatusField.options.choices.map((c: any) => c.name).join(', ')}`)

  await updateFieldOptions(
    historyTable.id,
    toStatusField.id,
    CORRECT_CALL_STATUSES
  )

  console.log(`  ✓ Updated to: ${CORRECT_CALL_STATUSES.join(', ')}`)
  console.log()

  console.log('='.repeat(80))
  console.log('✅ CALL STATUS OPTIONS CORRECTED')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
