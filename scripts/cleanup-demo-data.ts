// Cleanup demo dataset for KLS3 Sales OS
// IMPORTANT: Only deletes records with [DEMO] marker
// Safe deletion with relationship-aware ordering

import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

const envResult = loadEnv({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.error('❌ Failed to load .env.local:', envResult.error)
  process.exit(1)
}

import {
  getOpportunities,
  getCompanies,
  getContacts,
  getTasks,
  getActivities,
  getStageHistory,
  getValueEvents,
  deleteValueEvent,
  deleteStageHistory,
  deleteActivity,
  deleteTask,
  deleteOpportunity,
  deleteContact,
  deleteCompany,
} from '@/lib/airtable'

// ============================================================================
// HELPERS — DEMO MARKER DETECTION
// ============================================================================

/**
 * Safely checks if any of the provided values contains the [DEMO] marker.
 * Handles undefined/null values gracefully.
 */
function hasDemoMarker(...values: Array<string | undefined | null>): boolean {
  return values.some((value) => typeof value === 'string' && value.includes('[DEMO]'))
}

// ============================================================================
// DETECTION — FIND DEMO DATA
// ============================================================================

async function findDemoData() {
  console.log('🔍 Scanning for [DEMO] records...\n')

  const [opportunities, companies, contacts, tasks, activities, stageHistory, valueEvents] =
    await Promise.all([
      getOpportunities({ maxRecords: 500 }),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getTasks({ maxRecords: 500 }),
      getActivities({ maxRecords: 500 }),
      getStageHistory({ maxRecords: 500 }),
      getValueEvents({ maxRecords: 500 }),
    ])

  const demoOpportunities = opportunities.filter((o) => hasDemoMarker(o.name))
  const demoOpportunityIds = new Set(demoOpportunities.map((o) => o.id))

  const demoCompanies = companies.filter((c) => hasDemoMarker(c.name))
  const demoCompanyIds = new Set(demoCompanies.map((c) => c.id))

  const demoContacts = contacts.filter((c) => hasDemoMarker(c.firstName, c.lastName))
  const demoContactIds = new Set(demoContacts.map((c) => c.id))

  // Find tasks related to demo opportunities or contacts
  const demoTasks = tasks.filter(
    (t) =>
      (t.opportunityId && demoOpportunityIds.has(t.opportunityId)) ||
      (t.contactId && demoContactIds.has(t.contactId)) ||
      hasDemoMarker(t.notes)
  )

  // Find activities related to demo opportunities or contacts
  const demoActivities = activities.filter(
    (a) =>
      (a.opportunityId && demoOpportunityIds.has(a.opportunityId)) ||
      (a.contactId && demoContactIds.has(a.contactId)) ||
      hasDemoMarker(a.notes)
  )

  // Find stage history related to demo opportunities
  const demoStageHistory = stageHistory.filter(
    (s) => s.opportunityId && demoOpportunityIds.has(s.opportunityId)
  )

  // Find value events related to demo opportunities
  const demoValueEvents = valueEvents.filter(
    (v) => v.opportunityId && demoOpportunityIds.has(v.opportunityId)
  )

  return {
    opportunities: demoOpportunities,
    companies: demoCompanies,
    contacts: demoContacts,
    tasks: demoTasks,
    activities: demoActivities,
    stageHistory: demoStageHistory,
    valueEvents: demoValueEvents,
  }
}

// ============================================================================
// DELETION — SAFE RELATIONSHIP-AWARE ORDERING
// ============================================================================

async function deleteDemoData(demoData: Awaited<ReturnType<typeof findDemoData>>) {
  console.log('🗑️  DELETING DEMO DATA (relationship-safe ordering)...\n')

  let deletedCount = 0

  // 1. Delete Value Events first (child of Opportunities)
  if (demoData.valueEvents.length > 0) {
    console.log(`Deleting ${demoData.valueEvents.length} Value Events...`)
    for (const valueEvent of demoData.valueEvents) {
      await deleteValueEvent(valueEvent.id)
      deletedCount++
    }
    console.log(`✅ ${demoData.valueEvents.length} Value Events deleted\n`)
  }

  // 2. Delete Stage History (child of Opportunities)
  if (demoData.stageHistory.length > 0) {
    console.log(`Deleting ${demoData.stageHistory.length} Stage History records...`)
    for (const history of demoData.stageHistory) {
      await deleteStageHistory(history.id)
      deletedCount++
    }
    console.log(`✅ ${demoData.stageHistory.length} Stage History records deleted\n`)
  }

  // 3. Delete Activities (child of Opportunities/Contacts)
  if (demoData.activities.length > 0) {
    console.log(`Deleting ${demoData.activities.length} Activities...`)
    for (const activity of demoData.activities) {
      await deleteActivity(activity.id)
      deletedCount++
    }
    console.log(`✅ ${demoData.activities.length} Activities deleted\n`)
  }

  // 4. Delete Tasks (child of Opportunities/Contacts)
  if (demoData.tasks.length > 0) {
    console.log(`Deleting ${demoData.tasks.length} Tasks...`)
    for (const task of demoData.tasks) {
      await deleteTask(task.id)
      deletedCount++
    }
    console.log(`✅ ${demoData.tasks.length} Tasks deleted\n`)
  }

  // 5. Delete Opportunities (child of Companies/Contacts)
  if (demoData.opportunities.length > 0) {
    console.log(`Deleting ${demoData.opportunities.length} Opportunities...`)
    for (const opportunity of demoData.opportunities) {
      await deleteOpportunity(opportunity.id)
      deletedCount++
    }
    console.log(`✅ ${demoData.opportunities.length} Opportunities deleted\n`)
  }

  // 6. Delete Contacts (child of Companies)
  if (demoData.contacts.length > 0) {
    console.log(`Deleting ${demoData.contacts.length} Contacts...`)
    for (const contact of demoData.contacts) {
      await deleteContact(contact.id)
      deletedCount++
    }
    console.log(`✅ ${demoData.contacts.length} Contacts deleted\n`)
  }

  // 7. Delete Companies (root level)
  if (demoData.companies.length > 0) {
    console.log(`Deleting ${demoData.companies.length} Companies...`)
    for (const company of demoData.companies) {
      await deleteCompany(company.id)
      deletedCount++
    }
    console.log(`✅ ${demoData.companies.length} Companies deleted\n`)
  }

  return deletedCount
}

// ============================================================================
// MAIN
// ============================================================================

async function cleanup() {
  console.log('🧹 CLEANUP DEMO DATASET — KLS3 SALES OS\n')
  console.log('=' .repeat(70))
  console.log('SAFETY: Only records with [DEMO] marker will be deleted')
  console.log('=' .repeat(70))
  console.log()

  // 1. Find all demo data
  const demoData = await findDemoData()

  const totalRecords =
    demoData.opportunities.length +
    demoData.companies.length +
    demoData.contacts.length +
    demoData.tasks.length +
    demoData.activities.length +
    demoData.stageHistory.length +
    demoData.valueEvents.length

  if (totalRecords === 0) {
    console.log('✅ No demo data found. Nothing to delete.\n')
    return
  }

  // 2. Show what will be deleted
  console.log('📋 DEMO DATA FOUND:\n')
  console.log(`  Value Events: ${demoData.valueEvents.length}`)
  console.log(`  Stage History: ${demoData.stageHistory.length}`)
  console.log(`  Activities: ${demoData.activities.length}`)
  console.log(`  Tasks: ${demoData.tasks.length}`)
  console.log(`  Opportunities: ${demoData.opportunities.length}`)
  console.log(`  Contacts: ${demoData.contacts.length}`)
  console.log(`  Companies: ${demoData.companies.length}`)
  console.log()
  console.log(`  TOTAL: ${totalRecords} records`)
  console.log()

  // 3. Confirm deletion
  console.log('⚠️  WARNING: This action cannot be undone.')
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n')

  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 4. Delete in safe order
  const deletedCount = await deleteDemoData(demoData)

  // 5. Summary
  console.log('=' .repeat(70))
  console.log('✅ CLEANUP COMPLETE')
  console.log('=' .repeat(70))
  console.log()
  console.log(`Total records deleted: ${deletedCount}`)
  console.log()
  console.log('All [DEMO] records have been removed from Airtable.')
  console.log()
}

cleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ CLEANUP FAILED:', error)
    process.exit(1)
  })
