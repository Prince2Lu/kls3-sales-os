// Phase 4 test data seed
// Creates minimal test tasks for validating "Ma journée" functionality

import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

const envResult = loadEnv({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.error('❌ Failed to load .env.local:', envResult.error)
  process.exit(1)
}

import {
  getOpportunities,
  getContacts,
  createTask,
} from '@/lib/airtable'

async function seedPhase4Test() {
  console.log('🌱 Seeding Phase 4 test data...\n')

  try {
    // Get existing opportunities
    const opportunities = await getOpportunities({ maxRecords: 10 })
    const contacts = await getContacts({ maxRecords: 10 })

    if (opportunities.length === 0) {
      console.log('⚠️  No opportunities found. Please run seed-test-data first.')
      return
    }

    const testOpp = opportunities[0]
    const testContact = contacts.length > 0 ? contacts[0] : null

    console.log(`Using opportunity: ${testOpp.name} (${testOpp.id})`)
    if (testContact) {
      console.log(`Using contact: ${testContact.firstName} ${testContact.lastName}\n`)
    }

    // Create test tasks
    const now = new Date()
    const today = new Date()
    today.setHours(14, 0, 0, 0) // 14:00 today
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(10, 0, 0, 0) // 10:00 yesterday
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(15, 0, 0, 0)

    // CASE A - Overdue task
    console.log('Creating overdue task...')
    await createTask({
      opportunityId: testOpp.id,
      contactId: testContact?.id,
      type: 'FOLLOW_UP',
      dueAt: yesterday.toISOString(),
      priority: 'HIGH',
      status: 'TODO',
      notes: 'TEST: Overdue follow-up call',
      owner: 'Lilian',
    })

    // CASE B - Today task
    console.log('Creating today task...')
    await createTask({
      opportunityId: testOpp.id,
      contactId: testContact?.id,
      type: 'CALL',
      dueAt: today.toISOString(),
      priority: 'MEDIUM',
      status: 'TODO',
      notes: 'TEST: Call scheduled for today',
      owner: 'Lilian',
    })

    // CASE C - Today meeting
    console.log('Creating today meeting...')
    await createTask({
      opportunityId: testOpp.id,
      contactId: testContact?.id,
      type: 'MEETING',
      dueAt: today.toISOString(),
      priority: 'HIGH',
      status: 'TODO',
      notes: 'TEST: Meeting with prospect',
      owner: 'Lilian',
    })

    // CASE D - Future task (should NOT appear)
    console.log('Creating future task...')
    await createTask({
      opportunityId: testOpp.id,
      contactId: testContact?.id,
      type: 'EMAIL',
      dueAt: tomorrow.toISOString(),
      priority: 'LOW',
      status: 'TODO',
      notes: 'TEST: Future email (should not appear in today)',
      owner: 'Lilian',
    })

    console.log('\n✅ Phase 4 test data created successfully!')
    console.log('\nTest tasks created:')
    console.log('  - 1 overdue task (FOLLOW_UP)')
    console.log('  - 1 today task (CALL)')
    console.log('  - 1 today meeting (MEETING)')
    console.log('  - 1 future task (EMAIL - should not appear)')
    console.log('\nNow visit /today to verify!')
  } catch (error) {
    console.error('❌ Error seeding Phase 4 test data:', error)
    throw error
  }
}

if (require.main === module) {
  seedPhase4Test()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedPhase4Test }
