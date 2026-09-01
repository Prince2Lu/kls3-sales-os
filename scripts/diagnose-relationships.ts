// Relationship diagnostic script
// Verifies linked-record filtering behavior

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
  getCompanies,
  getContacts,
  getOpportunities,
  getActivities,
  getTasks,
  getStageHistory,
} from '@/lib/airtable'

async function diagnoseRelationships() {
  console.log('🔍 Diagnosing Airtable Relationships\n')

  try {
    // Find test company
    console.log('1️⃣  Looking for test company "Entreprise Notaire Test"...')
    const companies = await getCompanies({ maxRecords: 100 })
    const testCompany = companies.find((c) =>
      c.name.toLowerCase().includes('notaire test')
    )

    if (!testCompany) {
      console.log('   ❌ Test company not found')
      console.log('   Available companies:')
      companies.forEach((c) => console.log(`     - ${c.name} (${c.id})`))
      return
    }

    console.log(`   ✓ Found: ${testCompany.name}`)
    console.log(`     ID: ${testCompany.id}`)
    console.log('')

    // Test contacts filtering
    console.log('2️⃣  Testing getContacts({ companyId })...')
    const companyContacts = await getContacts({ companyId: testCompany.id })
    console.log(`   Result: ${companyContacts.length} contacts`)
    if (companyContacts.length > 0) {
      companyContacts.forEach((c) => {
        console.log(`     ✓ ${c.firstName} ${c.lastName} (${c.id})`)
        console.log(`       companyId: ${c.companyId || 'NULL'}`)
      })
    } else {
      console.log('   ⚠️  No contacts found for this company')
    }
    console.log('')

    // Get all contacts to verify
    console.log('3️⃣  Checking ALL contacts for company link...')
    const allContacts = await getContacts({ maxRecords: 100 })
    const linkedContacts = allContacts.filter(
      (c) => c.companyId === testCompany.id
    )
    console.log(`   Total contacts in system: ${allContacts.length}`)
    console.log(`   Contacts with matching companyId: ${linkedContacts.length}`)
    if (linkedContacts.length > 0) {
      linkedContacts.forEach((c) => {
        console.log(`     - ${c.firstName} ${c.lastName}`)
        console.log(`       ID: ${c.id}`)
        console.log(`       companyId: ${c.companyId}`)
      })
    }
    console.log('')

    // Test opportunities filtering
    console.log('4️⃣  Testing getOpportunities({ companyId })...')
    const companyOpportunities = await getOpportunities({
      companyId: testCompany.id,
    })
    console.log(`   Result: ${companyOpportunities.length} opportunities`)
    if (companyOpportunities.length > 0) {
      companyOpportunities.forEach((o) => {
        console.log(`     ✓ ${o.name} (${o.id})`)
        console.log(`       companyId: ${o.companyId || 'NULL'}`)
      })
    } else {
      console.log('   ⚠️  No opportunities found for this company')
    }
    console.log('')

    // Get all opportunities to verify
    console.log('5️⃣  Checking ALL opportunities for company link...')
    const allOpportunities = await getOpportunities({ maxRecords: 100 })
    const linkedOpportunities = allOpportunities.filter(
      (o) => o.companyId === testCompany.id
    )
    console.log(`   Total opportunities in system: ${allOpportunities.length}`)
    console.log(
      `   Opportunities with matching companyId: ${linkedOpportunities.length}`
    )
    if (linkedOpportunities.length > 0) {
      linkedOpportunities.forEach((o) => {
        console.log(`     - ${o.name}`)
        console.log(`       ID: ${o.id}`)
        console.log(`       companyId: ${o.companyId}`)
        console.log(`       primaryContactId: ${o.primaryContactId || 'NULL'}`)
      })
    }
    console.log('')

    // If we have a test opportunity, check activities and tasks
    const testOpp = linkedOpportunities.find((o) =>
      o.name.toLowerCase().includes('notaire test')
    )

    if (testOpp) {
      console.log('6️⃣  Testing Activities for opportunity...')
      console.log(`   Opportunity: ${testOpp.name} (${testOpp.id})`)
      const activities = await getActivities({ opportunityId: testOpp.id })
      console.log(`   Result: ${activities.length} activities`)
      if (activities.length > 0) {
        activities.forEach((a) => {
          console.log(`     ✓ ${a.type} on ${a.date}`)
          console.log(`       ID: ${a.id}`)
          console.log(`       opportunityId: ${a.opportunityId || 'NULL'}`)
          console.log(`       contactId: ${a.contactId || 'NULL'}`)
        })
      } else {
        console.log('   ⚠️  No activities found')
      }
      console.log('')

      console.log('7️⃣  Testing Tasks for opportunity...')
      const tasks = await getTasks({ opportunityId: testOpp.id })
      console.log(`   Result: ${tasks.length} tasks`)
      if (tasks.length > 0) {
        tasks.forEach((t) => {
          console.log(`     ✓ ${t.type} - ${t.status}`)
          console.log(`       ID: ${t.id}`)
          console.log(`       opportunityId: ${t.opportunityId || 'NULL'}`)
          console.log(`       contactId: ${t.contactId || 'NULL'}`)
          console.log(`       dueAt: ${t.dueAt || 'NULL'}`)
        })
      } else {
        console.log('   ⚠️  No tasks found')
      }
      console.log('')

      console.log('8️⃣  Testing Stage History for opportunity...')
      const stageHistory = await getStageHistory({ opportunityId: testOpp.id })
      console.log(`   Result: ${stageHistory.length} stage changes`)
      if (stageHistory.length > 0) {
        stageHistory.forEach((s) => {
          console.log(
            `     ✓ ${s.fromStage || 'N/A'} → ${s.toStage} on ${s.changedAt}`
          )
          console.log(`       opportunityId: ${s.opportunityId}`)
        })
      } else {
        console.log('   ⚠️  No stage history found')
      }
      console.log('')
    }

    console.log('✅ Diagnosis complete\n')
  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
    throw error
  }
}

// Run the diagnosis if this file is executed directly
if (require.main === module) {
  diagnoseRelationships()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { diagnoseRelationships }
