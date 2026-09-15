/**
 * AUDIT CALL STATUS VALUES
 *
 * Check what Call Status values are actually in use
 * Before modifying schema
 */

import { getColdCallTargets, getCallStatusHistory } from '../lib/airtable/index.js'

async function main() {
  console.log('='.repeat(80))
  console.log('AUDIT CALL STATUS VALUES')
  console.log('='.repeat(80))
  console.log()

  // Get all targets
  const targets = await getColdCallTargets({})
  console.log(`Found ${targets.length} Cold Call Targets`)

  // Count status usage in COLD_CALL_TARGETS
  const statusCounts = new Map<string, number>()
  for (const target of targets) {
    const count = statusCounts.get(target.callStatus) || 0
    statusCounts.set(target.callStatus, count + 1)
  }

  console.log()
  console.log('COLD_CALL_TARGETS.Call Status usage:')
  console.log('-'.repeat(80))
  for (const [status, count] of Array.from(statusCounts.entries()).sort()) {
    console.log(`  ${status}: ${count}`)
  }

  // Get all history records
  const history = await getCallStatusHistory({})
  console.log()
  console.log(`Found ${history.length} Call Status History records`)

  // Count status usage in CALL_STATUS_HISTORY
  const fromStatusCounts = new Map<string, number>()
  const toStatusCounts = new Map<string, number>()

  for (const record of history) {
    if (record.fromStatus) {
      const count = fromStatusCounts.get(record.fromStatus) || 0
      fromStatusCounts.set(record.fromStatus, count + 1)
    }
    const count = toStatusCounts.get(record.toStatus) || 0
    toStatusCounts.set(record.toStatus, count + 1)
  }

  console.log()
  console.log('CALL_STATUS_HISTORY.From Status usage:')
  console.log('-'.repeat(80))
  if (fromStatusCounts.size === 0) {
    console.log('  (none)')
  } else {
    for (const [status, count] of Array.from(fromStatusCounts.entries()).sort()) {
      console.log(`  ${status}: ${count}`)
    }
  }

  console.log()
  console.log('CALL_STATUS_HISTORY.To Status usage:')
  console.log('-'.repeat(80))
  if (toStatusCounts.size === 0) {
    console.log('  (none)')
  } else {
    for (const [status, count] of Array.from(toStatusCounts.entries()).sort()) {
      console.log(`  ${status}: ${count}`)
    }
  }

  console.log()
  console.log('='.repeat(80))
  console.log('AUDIT COMPLETE')
  console.log('='.repeat(80))

  // Check for invalid values
  const validStatuses = [
    'À appeler',
    'À rappeler',
    'Email Flow',
    'Mauvais numéro',
    'Pas intéressé',
    'RDV booké',
  ]

  const invalidInTargets = Array.from(statusCounts.keys()).filter(
    (s) => !validStatuses.includes(s)
  )
  const invalidInHistory = [
    ...Array.from(fromStatusCounts.keys()),
    ...Array.from(toStatusCounts.keys()),
  ].filter((s) => !validStatuses.includes(s))

  if (invalidInTargets.length > 0 || invalidInHistory.length > 0) {
    console.log()
    console.log('⚠️  INVALID VALUES FOUND:')
    if (invalidInTargets.length > 0) {
      console.log(`  COLD_CALL_TARGETS: ${invalidInTargets.join(', ')}`)
    }
    if (invalidInHistory.length > 0) {
      console.log(
        `  CALL_STATUS_HISTORY: ${[...new Set(invalidInHistory)].join(', ')}`
      )
    }
    console.log()
    console.log('⛔ CANNOT SAFELY REMOVE THESE OPTIONS')
    console.log('   Data migration required first')
  } else {
    console.log()
    console.log('✅ All values are valid - safe to update schema')
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
