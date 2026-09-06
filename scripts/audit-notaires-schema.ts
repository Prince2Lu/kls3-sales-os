// READ-ONLY AUDIT SCRIPT
// Mission: Inspect current KLS3 Sales OS schema for Notaires import planning
// CRITICAL: This script makes ZERO modifications to Airtable data or schema

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local from project root
config({ path: resolve(__dirname, '../.env.local') })

import {
  getBusinessLines,
  getCompanies,
  getContacts,
  getOpportunities,
  getTasks,
} from '@/lib/airtable'

async function auditSchema() {
  console.log('='.repeat(80))
  console.log('KLS3 SALES OS — SCHEMA AUDIT FOR NOTAIRES IMPORT')
  console.log('READ-ONLY MISSION — 0 MODIFICATIONS')
  console.log('='.repeat(80))
  console.log()

  // 1. Inspect KLS3_NOTAIRES Business Line
  console.log('1. BUSINESS LINE — KLS3_NOTAIRES')
  console.log('-'.repeat(80))

  const allBusinessLines = await getBusinessLines()
  const notairesBL = allBusinessLines.find((bl) => bl.code === 'KLS3_NOTAIRES')

  if (!notairesBL) {
    console.log('❌ KLS3_NOTAIRES Business Line NOT FOUND')
    console.log('   This is a BLOCKER for import.')
    console.log()
  } else {
    console.log('✅ KLS3_NOTAIRES Business Line found')
    console.log()
    console.log(`   ID: ${notairesBL.id}`)
    console.log(`   Name: ${notairesBL.name}`)
    console.log(`   Code: ${notairesBL.code}`)
    console.log(`   Category: ${notairesBL.category}`)
    console.log(`   Revenue Trigger: ${notairesBL.revenueTrigger}`)
    console.log(`   Revenue Type: ${notairesBL.revenueType}`)
    console.log(`   Default Unit Value: ${notairesBL.defaultUnitValue ?? 'null'}`)
    console.log(`   Active: ${notairesBL.active}`)
    console.log()
  }

  // 2. Sample existing Companies to understand data patterns
  console.log('2. SAMPLE COMPANIES (first 3 records)')
  console.log('-'.repeat(80))

  const allCompanies = await getCompanies({ maxRecords: 3 })

  if (allCompanies.length === 0) {
    console.log('   No existing companies found.')
  } else {
    allCompanies.forEach((company, index) => {
      console.log(`   Company ${index + 1}:`)
      console.log(`      ID: ${company.id}`)
      console.log(`      Name: ${company.name}`)
      console.log(`      Primary Business Line ID: ${company.primaryBusinessLineId ?? 'null'}`)
      console.log(`      Website: ${company.website ?? 'null'}`)
      console.log(`      Industry: ${company.industry ?? 'null'}`)
      console.log(`      Address Line 1: ${company.addressLine1 ?? 'null'}`)
      console.log(`      Address Line 2: ${company.addressLine2 ?? 'null'}`)
      console.log(`      Postal Code: ${company.postalCode ?? 'null'}`)
      console.log(`      City: ${company.city ?? 'null'}`)
      console.log(`      Country: ${company.country ?? 'null'}`)
      console.log(`      Phone: ${company.phone ?? 'null'}`)
      console.log(`      Company Size: ${company.companySize ?? 'null'}`)
      console.log(`      LinkedIn: ${company.linkedin ?? 'null'}`)
      console.log(`      Notes: ${company.notes ? `${company.notes.substring(0, 50)}...` : 'null'}`)
      console.log(`      Created At: ${company.createdAt}`)
      console.log(`      Updated At: ${company.updatedAt}`)
      console.log()
    })
  }

  // 3. Sample existing Contacts
  console.log('3. SAMPLE CONTACTS (first 3 records)')
  console.log('-'.repeat(80))

  const allContacts = await getContacts({ maxRecords: 3 })

  if (allContacts.length === 0) {
    console.log('   No existing contacts found.')
  } else {
    allContacts.forEach((contact, index) => {
      console.log(`   Contact ${index + 1}:`)
      console.log(`      ID: ${contact.id}`)
      console.log(`      First Name: ${contact.firstName}`)
      console.log(`      Last Name: ${contact.lastName}`)
      console.log(`      Company ID: ${contact.companyId ?? 'null'}`)
      console.log(`      Job Title: ${contact.jobTitle ?? 'null'}`)
      console.log(`      Email: ${contact.email ?? 'null'}`)
      console.log(`      Phone: ${contact.phone ?? 'null'}`)
      console.log(`      LinkedIn: ${contact.linkedin ?? 'null'}`)
      console.log(`      Notes: ${contact.notes ? `${contact.notes.substring(0, 50)}...` : 'null'}`)
      console.log(`      Created At: ${contact.createdAt}`)
      console.log(`      Updated At: ${contact.updatedAt}`)
      console.log()
    })
  }

  // 4. Sample existing Opportunities
  console.log('4. SAMPLE OPPORTUNITIES (first 3 records)')
  console.log('-'.repeat(80))

  const allOpportunities = await getOpportunities({ maxRecords: 3 })

  if (allOpportunities.length === 0) {
    console.log('   No existing opportunities found.')
  } else {
    allOpportunities.forEach((opp, index) => {
      console.log(`   Opportunity ${index + 1}:`)
      console.log(`      ID: ${opp.id}`)
      console.log(`      Name: ${opp.name}`)
      console.log(`      Company ID: ${opp.companyId ?? 'null'}`)
      console.log(`      Primary Contact ID: ${opp.primaryContactId ?? 'null'}`)
      console.log(`      Business Line ID: ${opp.businessLineId}`)
      console.log(`      Owner: ${opp.owner}`)
      console.log(`      Stage: ${opp.stage}`)
      console.log(`      Source: ${opp.source ?? 'null'}`)
      console.log(`      Priority: ${opp.priority ?? 'null'}`)
      console.log(`      Potential Value: ${opp.potentialValue ?? 'null'}`)
      console.log(`      Probability: ${opp.probability ?? 'null'}`)
      console.log(`      Expected Close Date: ${opp.expectedCloseDate ?? 'null'}`)
      console.log(`      Problem: ${opp.problem ? `${opp.problem.substring(0, 50)}...` : 'null'}`)
      console.log(`      Need: ${opp.need ? `${opp.need.substring(0, 50)}...` : 'null'}`)
      console.log(`      Next Step Notes: ${opp.nextStepNotes ? `${opp.nextStepNotes.substring(0, 50)}...` : 'null'}`)
      console.log(`      Lost Reason: ${opp.lostReason ?? 'null'}`)
      console.log(`      Created At: ${opp.createdAt}`)
      console.log(`      Updated At: ${opp.updatedAt}`)
      console.log(`      Won At: ${opp.wonAt ?? 'null'}`)
      console.log(`      Lost At: ${opp.lostAt ?? 'null'}`)
      console.log()
    })
  }

  // 5. Sample existing Tasks
  console.log('5. SAMPLE TASKS (first 3 records)')
  console.log('-'.repeat(80))

  const allTasks = await getTasks({ maxRecords: 3 })

  if (allTasks.length === 0) {
    console.log('   No existing tasks found.')
  } else {
    allTasks.forEach((task, index) => {
      console.log(`   Task ${index + 1}:`)
      console.log(`      ID: ${task.id}`)
      console.log(`      Opportunity ID: ${task.opportunityId ?? 'null'}`)
      console.log(`      Contact ID: ${task.contactId ?? 'null'}`)
      console.log(`      Type: ${task.type}`)
      console.log(`      Due At: ${task.dueAt ?? 'null'}`)
      console.log(`      Priority: ${task.priority ?? 'null'}`)
      console.log(`      Status: ${task.status}`)
      console.log(`      Notes: ${task.notes ? `${task.notes.substring(0, 50)}...` : 'null'}`)
      console.log(`      Owner: ${task.owner}`)
      console.log(`      Created At: ${task.createdAt}`)
      console.log(`      Completed At: ${task.completedAt ?? 'null'}`)
      console.log()
    })
  }

  // 6. All Business Lines
  console.log('6. ALL BUSINESS LINES')
  console.log('-'.repeat(80))

  allBusinessLines.forEach((bl) => {
    console.log(`   ${bl.code}:`)
    console.log(`      ID: ${bl.id}`)
    console.log(`      Name: ${bl.name}`)
    console.log(`      Category: ${bl.category}`)
    console.log(`      Active: ${bl.active}`)
    console.log()
  })

  console.log('='.repeat(80))
  console.log('AUDIT COMPLETE')
  console.log('MODIFICATIONS MADE: 0')
  console.log('RECORDS CREATED: 0')
  console.log('RECORDS UPDATED: 0')
  console.log('RECORDS DELETED: 0')
  console.log('SCHEMA CHANGES: 0')
  console.log('='.repeat(80))
}

// Execute
auditSchema()
  .then(() => {
    console.log('✅ Audit completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Audit failed:', error)
    process.exit(1)
  })
