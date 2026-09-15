/**
 * CHECK SCHEMA
 *
 * Display current field options for Call Status fields
 */

import { config, getHeaders } from '../lib/airtable/config.js'

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

async function main() {
  console.log('='.repeat(80))
  console.log('CALL STATUS SCHEMA CHECK')
  console.log('='.repeat(80))
  console.log()

  // Check COLD_CALL_TARGETS.Call Status
  console.log('COLD_CALL_TARGETS.Call Status:')
  console.log('-'.repeat(80))
  const targetsTable = await getTableSchema('COLD_CALL_TARGETS')
  const callStatusField = targetsTable.fields.find(
    (f: any) => f.name === 'Call Status'
  )
  if (callStatusField) {
    callStatusField.options.choices.forEach((choice: any, i: number) => {
      console.log(`  ${i + 1}. ${choice.name}`)
    })
  }
  console.log()

  // Check CALL_STATUS_HISTORY.From Status
  console.log('CALL_STATUS_HISTORY.From Status:')
  console.log('-'.repeat(80))
  const historyTable = await getTableSchema('CALL_STATUS_HISTORY')
  const fromStatusField = historyTable.fields.find(
    (f: any) => f.name === 'From Status'
  )
  if (fromStatusField) {
    fromStatusField.options.choices.forEach((choice: any, i: number) => {
      console.log(`  ${i + 1}. ${choice.name}`)
    })
  }
  console.log()

  // Check CALL_STATUS_HISTORY.To Status
  console.log('CALL_STATUS_HISTORY.To Status:')
  console.log('-'.repeat(80))
  const toStatusField = historyTable.fields.find(
    (f: any) => f.name === 'To Status'
  )
  if (toStatusField) {
    toStatusField.options.choices.forEach((choice: any, i: number) => {
      console.log(`  ${i + 1}. ${choice.name}`)
    })
  }
  console.log()

  console.log('='.repeat(80))

  const expectedStatuses = [
    'À appeler',
    'À rappeler',
    'Email Flow',
    'Mauvais numéro',
    'Pas intéressé',
    'RDV booké',
  ]

  const targetsOptions = callStatusField.options.choices.map((c: any) => c.name)
  const fromOptions = fromStatusField.options.choices.map((c: any) => c.name)
  const toOptions = toStatusField.options.choices.map((c: any) => c.name)

  const allCorrect =
    JSON.stringify(targetsOptions.sort()) === JSON.stringify(expectedStatuses.sort()) &&
    JSON.stringify(fromOptions.sort()) === JSON.stringify(expectedStatuses.sort()) &&
    JSON.stringify(toOptions.sort()) === JSON.stringify(expectedStatuses.sort())

  if (allCorrect) {
    console.log('✅ All Call Status fields have correct options')
  } else {
    console.log('⚠️  Some fields have incorrect options')
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
