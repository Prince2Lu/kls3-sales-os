/**
 * AIRTABLE CLEANUP PREVIEW
 *
 * Mission: READ-ONLY audit of current Airtable data
 *
 * Identifies:
 * - Test data candidates for deletion
 * - Real data to keep
 * - Ambiguous records requiring review
 * - Dependencies between records
 *
 * IMPORTANT:
 * - NO deletions
 * - NO modifications
 * - NO schema changes
 * - Creates backup JSON locally
 * - Generates cleanup plan for human approval
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  getBusinessLines,
  getCompanies,
  getContacts,
  getOpportunities,
  getActivities,
  getTasks,
  getValueEvents,
  getUsers,
} from '../lib/airtable/index.js'

// ============================================================================
// TYPES
// ============================================================================

type Classification = 'KEEP' | 'DELETE_CANDIDATE' | 'REVIEW'

interface AuditRecord {
  table: string
  recordId: string
  name: string
  businessLine?: string
  relatedCompany?: string
  relatedContact?: string
  relatedOpportunity?: string
  createdAt?: string
  reason: string
  classification: Classification
  data?: any // Full record for backup
}

interface CleanupStats {
  total: number
  keep: number
  deleteCandidate: number
  review: number
}

interface TableAudit {
  stats: CleanupStats
  records: AuditRecord[]
}

interface CleanupPlan {
  companies: TableAudit
  contacts: TableAudit
  opportunities: TableAudit
  activities: TableAudit
  tasks: TableAudit
  valueEvents: TableAudit
  stageHistory: TableAudit
  goals: TableAudit
  users: TableAudit
  businessLines: TableAudit
}

// ============================================================================
// CLASSIFICATION HELPERS
// ============================================================================

function isTestCompanyName(name: string): boolean {
  if (!name) return false

  const testPatterns = [
    /test/i,
    /demo/i,
    /example/i,
    /acme/i,
    /sample/i,
    /fake/i,
    /dummy/i,
    /temp/i,
    /debug/i,
    /\bzzz/i, // Often used for test data
  ]

  return testPatterns.some(pattern => pattern.test(name))
}

function isTestContactName(firstName: string, lastName: string): boolean {
  const fullName = `${firstName} ${lastName}`.toLowerCase()

  const testPatterns = [
    /test/i,
    /demo/i,
    /example/i,
    /sample/i,
    /fake/i,
    /dummy/i,
    /john doe/i,
    /jane doe/i,
  ]

  return testPatterns.some(pattern => pattern.test(fullName))
}

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

async function main() {
  console.log('================================================================================')
  console.log('AIRTABLE CLEANUP PREVIEW — READ-ONLY AUDIT')
  console.log('================================================================================')
  console.log()

  // Step 1: Fetch all data
  console.log('Step 1: Fetching current Airtable data...')
  const businessLines = await getBusinessLines()
  const companies = await getCompanies()
  const contacts = await getContacts()
  const opportunities = await getOpportunities()
  const activities = await getActivities()
  const tasks = await getTasks()
  const valueEvents = await getValueEvents()
  const users = await getUsers()

  console.log(`  Business Lines: ${businessLines.length}`)
  console.log(`  Companies: ${companies.length}`)
  console.log(`  Contacts: ${contacts.length}`)
  console.log(`  Opportunities: ${opportunities.length}`)
  console.log(`  Activities: ${activities.length}`)
  console.log(`  Tasks: ${tasks.length}`)
  console.log(`  Value Events: ${valueEvents.length}`)
  console.log(`  Users: ${users.length}`)
  console.log()

  // Step 2: Initialize cleanup plan
  console.log('Step 2: Analyzing records...')

  const plan: CleanupPlan = {
    companies: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    contacts: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    opportunities: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    activities: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    tasks: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    valueEvents: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    stageHistory: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    goals: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    users: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
    businessLines: { stats: { total: 0, keep: 0, deleteCandidate: 0, review: 0 }, records: [] },
  }

  // Step 3: Audit BUSINESS_LINES - ALWAYS KEEP
  businessLines.forEach(bl => {
    plan.businessLines.stats.total++
    plan.businessLines.stats.keep++
    plan.businessLines.records.push({
      table: 'BUSINESS_LINES',
      recordId: bl.id,
      name: bl.name,
      reason: 'Business Line configuration - never delete',
      classification: 'KEEP',
      data: bl,
    })
  })

  // Step 4: Audit USERS - ALWAYS KEEP
  users.forEach(user => {
    plan.users.stats.total++
    plan.users.stats.keep++
    plan.users.records.push({
      table: 'USERS',
      recordId: user.id,
      name: user.name,
      reason: 'User account - never delete',
      classification: 'KEEP',
      data: user,
    })
  })

  // Step 5: Audit OPPORTUNITIES first (drives dependencies)
  console.log('  Analyzing Opportunities...')
  opportunities.forEach(opp => {
    plan.opportunities.stats.total++

    let classification: Classification = 'REVIEW'
    let reason = 'Unknown origin - requires manual review'

    const company = companies.find(c => c.id === opp.companyId)
    const contact = contacts.find(c => c.id === opp.primaryContactId)
    const businessLine = businessLines.find(bl => bl.id === opp.businessLineId)

    // Check if opportunity name contains test patterns
    if (opp.name && isTestCompanyName(opp.name)) {
      classification = 'DELETE_CANDIDATE'
      reason = 'Opportunity name contains test pattern'
    }
    // Check if company is test
    else if (company && isTestCompanyName(company.name)) {
      classification = 'DELETE_CANDIDATE'
      reason = 'Related company is test data'
    }
    // Check if contact is test
    else if (contact && isTestContactName(contact.firstName, contact.lastName)) {
      classification = 'DELETE_CANDIDATE'
      reason = 'Related contact is test data'
    }
    // Check stage - if Gagné or Perdu, might be test for validation
    else if (opp.stage === 'Gagné' || opp.stage === 'Perdu') {
      classification = 'REVIEW'
      reason = `Opportunity marked as ${opp.stage} - verify if test or real`
    }

    // Increment appropriate stat counter based on classification
    if (classification === 'DELETE_CANDIDATE') {
      plan.opportunities.stats.deleteCandidate++
    } else {
      // Default is 'REVIEW' - no opportunities are auto-classified as 'KEEP'
      plan.opportunities.stats.review++
    }

    plan.opportunities.records.push({
      table: 'OPPORTUNITIES',
      recordId: opp.id,
      name: opp.name,
      businessLine: businessLine?.name,
      relatedCompany: company?.name,
      relatedContact: contact ? `${contact.firstName} ${contact.lastName}` : undefined,
      createdAt: opp.createdAt,
      reason,
      classification,
      data: opp,
    })
  })

  // Step 6: Audit COMPANIES
  console.log('  Analyzing Companies...')
  companies.forEach(company => {
    plan.companies.stats.total++

    let classification: Classification = 'REVIEW'
    let reason = 'Unknown origin - requires manual review'

    // Check if company name is test
    if (isTestCompanyName(company.name)) {
      classification = 'DELETE_CANDIDATE'
      reason = 'Company name contains test pattern'
    }
    // Check if company is completely empty (orphan)
    else if (!company.name || company.name.trim() === '') {
      classification = 'DELETE_CANDIDATE'
      reason = 'Empty/orphan company with no data'
    }
    // Check if company has opportunities
    else {
      const companyOpps = opportunities.filter(o => o.companyId === company.id)
      if (companyOpps.length === 0) {
        classification = 'DELETE_CANDIDATE'
        reason = 'Company with no opportunities - orphan test data'
      } else {
        // Check if all opportunities are DELETE_CANDIDATE
        const allOppsAreTest = companyOpps.every(opp => {
          const oppAudit = plan.opportunities.records.find(r => r.recordId === opp.id)
          return oppAudit?.classification === 'DELETE_CANDIDATE'
        })

        if (allOppsAreTest) {
          classification = 'DELETE_CANDIDATE'
          reason = 'All related opportunities are test data'
        } else {
          classification = 'KEEP'
          reason = 'Has real opportunities'
        }
      }
    }

    plan.companies.stats[classification === 'KEEP' ? 'keep' : classification === 'DELETE_CANDIDATE' ? 'deleteCandidate' : 'review']++

    plan.companies.records.push({
      table: 'COMPANIES',
      recordId: company.id,
      name: company.name,
      createdAt: company.createdAt,
      reason,
      classification,
      data: company,
    })
  })

  // Step 7: Audit CONTACTS
  console.log('  Analyzing Contacts...')
  contacts.forEach(contact => {
    plan.contacts.stats.total++

    let classification: Classification = 'REVIEW'
    let reason = 'Unknown origin - requires manual review'

    const fullName = `${contact.firstName} ${contact.lastName}`
    const company = companies.find(c => c.id === contact.companyId)

    // Check if contact name is test
    if (isTestContactName(contact.firstName, contact.lastName)) {
      classification = 'DELETE_CANDIDATE'
      reason = 'Contact name contains test pattern'
    }
    // Check if company is test
    else if (company) {
      const companyAudit = plan.companies.records.find(r => r.recordId === company.id)
      if (companyAudit?.classification === 'DELETE_CANDIDATE') {
        classification = 'DELETE_CANDIDATE'
        reason = 'Related company is test data'
      } else if (companyAudit?.classification === 'KEEP') {
        classification = 'KEEP'
        reason = 'Related company is real data'
      }
    } else {
      classification = 'REVIEW'
      reason = 'Contact without company - verify if orphan test data'
    }

    plan.contacts.stats[classification === 'KEEP' ? 'keep' : classification === 'DELETE_CANDIDATE' ? 'deleteCandidate' : 'review']++

    plan.contacts.records.push({
      table: 'CONTACTS',
      recordId: contact.id,
      name: fullName,
      relatedCompany: company?.name,
      createdAt: contact.createdAt,
      reason,
      classification,
      data: contact,
    })
  })

  // Step 8: Audit ACTIVITIES
  console.log('  Analyzing Activities...')
  activities.forEach(activity => {
    plan.activities.stats.total++

    let classification: Classification = 'REVIEW'
    let reason = 'Unknown origin - requires manual review'

    const opportunity = opportunities.find(o => o.id === activity.opportunityId)

    if (opportunity) {
      const oppAudit = plan.opportunities.records.find(r => r.recordId === opportunity.id)
      if (oppAudit?.classification === 'DELETE_CANDIDATE') {
        classification = 'DELETE_CANDIDATE'
        reason = 'Related opportunity is test data'
      } else if (oppAudit?.classification === 'KEEP') {
        classification = 'KEEP'
        reason = 'Related opportunity is real data'
      }
    } else {
      classification = 'REVIEW'
      reason = 'Activity without opportunity - verify if orphan test data'
    }

    plan.activities.stats[classification === 'KEEP' ? 'keep' : classification === 'DELETE_CANDIDATE' ? 'deleteCandidate' : 'review']++

    plan.activities.records.push({
      table: 'ACTIVITIES',
      recordId: activity.id,
      name: `${activity.type} - ${activity.date}`,
      relatedOpportunity: opportunity?.name,
      createdAt: activity.createdAt,
      reason,
      classification,
      data: activity,
    })
  })

  // Step 9: Audit TASKS
  console.log('  Analyzing Tasks...')
  tasks.forEach(task => {
    plan.tasks.stats.total++

    let classification: Classification = 'REVIEW'
    let reason = 'Unknown origin - requires manual review'

    const opportunity = opportunities.find(o => o.id === task.opportunityId)

    if (opportunity) {
      const oppAudit = plan.opportunities.records.find(r => r.recordId === opportunity.id)
      if (oppAudit?.classification === 'DELETE_CANDIDATE') {
        classification = 'DELETE_CANDIDATE'
        reason = 'Related opportunity is test data'
      } else if (oppAudit?.classification === 'KEEP') {
        classification = 'KEEP'
        reason = 'Related opportunity is real data'
      }
    } else {
      classification = 'REVIEW'
      reason = 'Task without opportunity - verify if orphan test data'
    }

    plan.tasks.stats[classification === 'KEEP' ? 'keep' : classification === 'DELETE_CANDIDATE' ? 'deleteCandidate' : 'review']++

    plan.tasks.records.push({
      table: 'TASKS',
      recordId: task.id,
      name: `${task.type} - ${task.dueAt}`,
      relatedOpportunity: opportunity?.name,
      createdAt: task.createdAt,
      reason,
      classification,
      data: task,
    })
  })

  // Step 10: Audit VALUE_EVENTS
  console.log('  Analyzing Value Events...')
  valueEvents.forEach(ve => {
    plan.valueEvents.stats.total++

    let classification: Classification = 'REVIEW'
    let reason = 'Unknown origin - requires manual review'

    const opportunity = opportunities.find(o => o.id === ve.opportunityId)

    if (opportunity) {
      const oppAudit = plan.opportunities.records.find(r => r.recordId === opportunity.id)
      if (oppAudit?.classification === 'DELETE_CANDIDATE') {
        classification = 'DELETE_CANDIDATE'
        reason = 'Related opportunity is test data'
      } else if (oppAudit?.classification === 'KEEP') {
        classification = 'KEEP'
        reason = 'Related opportunity is real data'
      }
    } else {
      classification = 'REVIEW'
      reason = 'Value Event without opportunity - verify if orphan test data'
    }

    plan.valueEvents.stats[classification === 'KEEP' ? 'keep' : classification === 'DELETE_CANDIDATE' ? 'deleteCandidate' : 'review']++

    plan.valueEvents.records.push({
      table: 'VALUE_EVENTS',
      recordId: ve.id,
      name: `${ve.eventType} - ${ve.amount}€`,
      relatedOpportunity: opportunity?.name,
      createdAt: ve.createdAt,
      reason,
      classification,
      data: ve,
    })
  })

  console.log()

  // Step 11: Generate markdown report
  console.log('Step 3: Generating cleanup preview report...')
  const markdown = generateMarkdownReport(plan)
  const mdPath = resolve(__dirname, '../AIRTABLE_CLEANUP_PREVIEW.md')
  writeFileSync(mdPath, markdown, 'utf-8')
  console.log(`✅ Markdown report: ${mdPath}`)

  // Step 12: Generate backup JSON
  console.log('Step 4: Creating backup JSON...')
  const backupPath = resolve(__dirname, '../AIRTABLE_CLEANUP_BACKUP.json')
  const backup = {
    timestamp: new Date().toISOString(),
    plan,
    allRecords: {
      businessLines,
      companies,
      contacts,
      opportunities,
      activities,
      tasks,
      valueEvents,
      users,
    }
  }
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8')
  console.log(`✅ Backup JSON: ${backupPath}`)
  console.log()

  // Step 13: Display summary
  console.log('================================================================================')
  console.log('CLEANUP PREVIEW SUMMARY')
  console.log('================================================================================')
  console.log()

  displayTableSummary('COMPANIES', plan.companies.stats)
  displayTableSummary('CONTACTS', plan.contacts.stats)
  displayTableSummary('OPPORTUNITIES', plan.opportunities.stats)
  displayTableSummary('ACTIVITIES', plan.activities.stats)
  displayTableSummary('TASKS', plan.tasks.stats)
  displayTableSummary('VALUE_EVENTS', plan.valueEvents.stats)
  displayTableSummary('USERS', plan.users.stats)
  displayTableSummary('BUSINESS_LINES', plan.businessLines.stats)

  console.log()

  // Calculate total deletions
  const totalDeletions =
    plan.companies.stats.deleteCandidate +
    plan.contacts.stats.deleteCandidate +
    plan.opportunities.stats.deleteCandidate +
    plan.activities.stats.deleteCandidate +
    plan.tasks.stats.deleteCandidate +
    plan.valueEvents.stats.deleteCandidate

  const totalReview =
    plan.companies.stats.review +
    plan.contacts.stats.review +
    plan.opportunities.stats.review +
    plan.activities.stats.review +
    plan.tasks.stats.review +
    plan.valueEvents.stats.review

  console.log(`TOTAL DELETE_CANDIDATE: ${totalDeletions}`)
  console.log(`TOTAL REVIEW: ${totalReview}`)
  console.log()

  // Safety check
  const safeToRequest = totalReview === 0 && totalDeletions > 0
  console.log(`SAFE TO REQUEST DELETE APPROVAL: ${safeToRequest ? 'YES' : 'NO'}`)

  if (!safeToRequest) {
    if (totalReview > 0) {
      console.log(`Reason: ${totalReview} records require manual REVIEW before approval`)
    }
    if (totalDeletions === 0) {
      console.log('Reason: No records identified for deletion')
    }
  }

  console.log()
  console.log('CONFIRMATION — READ-ONLY AUDIT:')
  console.log('  Airtable records created: 0')
  console.log('  Airtable records modified: 0')
  console.log('  Airtable records deleted: 0')
  console.log('  Airtable schema changes: 0')
  console.log('  Imports executed: 0')
  console.log()
  console.log('✅ Cleanup preview completed successfully')
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(plan: CleanupPlan): string {
  let md = '# AIRTABLE CLEANUP PREVIEW\n\n'
  md += `**Date**: ${new Date().toISOString().split('T')[0]}\n`
  md += `**Mission**: READ-ONLY audit before Notaires import\n`
  md += `**Status**: ✅ PREVIEW COMPLETE — 0 MODIFICATIONS\n\n`
  md += '---\n\n'

  // Summary
  md += '## 1. RÉSUMÉ GLOBAL\n\n'
  md += '| Table | Total | KEEP | DELETE_CANDIDATE | REVIEW |\n'
  md += '|-------|-------|------|------------------|--------|\n'
  md += generateTableRow('COMPANIES', plan.companies.stats)
  md += generateTableRow('CONTACTS', plan.contacts.stats)
  md += generateTableRow('OPPORTUNITIES', plan.opportunities.stats)
  md += generateTableRow('ACTIVITIES', plan.activities.stats)
  md += generateTableRow('TASKS', plan.tasks.stats)
  md += generateTableRow('VALUE_EVENTS', plan.valueEvents.stats)
  md += generateTableRow('USERS', plan.users.stats)
  md += generateTableRow('BUSINESS_LINES', plan.businessLines.stats)
  md += '\n---\n\n'

  // Delete candidates
  md += '## 2. RECORDS CANDIDATS À SUPPRESSION\n\n'

  const deleteCandidates = [
    ...plan.companies.records.filter(r => r.classification === 'DELETE_CANDIDATE'),
    ...plan.contacts.records.filter(r => r.classification === 'DELETE_CANDIDATE'),
    ...plan.opportunities.records.filter(r => r.classification === 'DELETE_CANDIDATE'),
    ...plan.activities.records.filter(r => r.classification === 'DELETE_CANDIDATE'),
    ...plan.tasks.records.filter(r => r.classification === 'DELETE_CANDIDATE'),
    ...plan.valueEvents.records.filter(r => r.classification === 'DELETE_CANDIDATE'),
  ]

  if (deleteCandidates.length > 0) {
    md += '| Table | Record ID | Name | Business Line | Related Company | Related Contact | Related Opportunity | Created At | Reason |\n'
    md += '|-------|-----------|------|---------------|-----------------|-----------------|---------------------|------------|--------|\n'
    deleteCandidates.forEach(r => {
      md += `| ${r.table} | ${r.recordId} | ${r.name} | ${r.businessLine || '-'} | ${r.relatedCompany || '-'} | ${r.relatedContact || '-'} | ${r.relatedOpportunity || '-'} | ${r.createdAt || '-'} | ${r.reason} |\n`
    })
  } else {
    md += '✅ **No records identified as DELETE_CANDIDATE**\n'
  }

  md += '\n---\n\n'

  // Review items
  md += '## 3. RECORDS REQUIRING REVIEW\n\n'

  const reviewRecords = [
    ...plan.companies.records.filter(r => r.classification === 'REVIEW'),
    ...plan.contacts.records.filter(r => r.classification === 'REVIEW'),
    ...plan.opportunities.records.filter(r => r.classification === 'REVIEW'),
    ...plan.activities.records.filter(r => r.classification === 'REVIEW'),
    ...plan.tasks.records.filter(r => r.classification === 'REVIEW'),
    ...plan.valueEvents.records.filter(r => r.classification === 'REVIEW'),
  ]

  if (reviewRecords.length > 0) {
    md += `⚠️ **${reviewRecords.length} records require manual REVIEW**\n\n`
    md += '| Table | Record ID | Name | Business Line | Related Company | Related Contact | Related Opportunity | Created At | Reason |\n'
    md += '|-------|-----------|------|---------------|-----------------|-----------------|---------------------|------------|--------|\n'
    reviewRecords.forEach(r => {
      md += `| ${r.table} | ${r.recordId} | ${r.name} | ${r.businessLine || '-'} | ${r.relatedCompany || '-'} | ${r.relatedContact || '-'} | ${r.relatedOpportunity || '-'} | ${r.createdAt || '-'} | ${r.reason} |\n`
    })
  } else {
    md += '✅ **No records require REVIEW**\n'
  }

  md += '\n---\n\n'

  // Keep records
  md += '## 4. RECORDS À CONSERVER EXPLICITEMENT\n\n'
  md += '### USERS (always keep)\n\n'
  plan.users.records.forEach(r => {
    md += `- **${r.name}** (${r.recordId})\n`
  })
  md += '\n'

  md += '### BUSINESS_LINES (always keep)\n\n'
  plan.businessLines.records.forEach(r => {
    md += `- **${r.name}** (${r.recordId})\n`
  })
  md += '\n'

  const keepRecords = [
    ...plan.companies.records.filter(r => r.classification === 'KEEP'),
    ...plan.contacts.records.filter(r => r.classification === 'KEEP'),
    ...plan.opportunities.records.filter(r => r.classification === 'KEEP'),
  ]

  if (keepRecords.length > 0) {
    md += '### Other KEEP records\n\n'
    md += '| Table | Record ID | Name | Reason |\n'
    md += '|-------|-----------|------|--------|\n'
    keepRecords.forEach(r => {
      md += `| ${r.table} | ${r.recordId} | ${r.name} | ${r.reason} |\n`
    })
  }

  md += '\n---\n\n'

  // Dependencies
  md += '## 5. DÉPENDANCES\n\n'
  md += 'Pour chaque Opportunity DELETE_CANDIDATE, records liés impactés:\n\n'

  const oppCandidates = plan.opportunities.records.filter(r => r.classification === 'DELETE_CANDIDATE')

  if (oppCandidates.length > 0) {
    oppCandidates.forEach(opp => {
      md += `### ${opp.name} (${opp.recordId})\n\n`

      const relatedActivities = plan.activities.records.filter(r => r.relatedOpportunity === opp.name)
      const relatedTasks = plan.tasks.records.filter(r => r.relatedOpportunity === opp.name)
      const relatedValueEvents = plan.valueEvents.records.filter(r => r.relatedOpportunity === opp.name)

      md += `- Activities: ${relatedActivities.length}\n`
      md += `- Tasks: ${relatedTasks.length}\n`
      md += `- Value Events: ${relatedValueEvents.length}\n`
      md += '\n'
    })
  } else {
    md += 'No opportunities marked for deletion\n'
  }

  md += '\n---\n\n'

  // Risks
  md += '## 6. RISQUES\n\n'

  const risks: string[] = []

  if (reviewRecords.length > 0) {
    risks.push(`⚠️ ${reviewRecords.length} records require manual review - cannot proceed without validation`)
  }

  const orphanContacts = plan.contacts.records.filter(r => !r.relatedCompany)
  if (orphanContacts.length > 0) {
    risks.push(`⚠️ ${orphanContacts.length} contacts without company - verify orphan status`)
  }

  const orphanActivities = plan.activities.records.filter(r => !r.relatedOpportunity)
  if (orphanActivities.length > 0) {
    risks.push(`⚠️ ${orphanActivities.length} activities without opportunity - verify orphan status`)
  }

  if (risks.length > 0) {
    risks.forEach(risk => md += `${risk}\n\n`)
  } else {
    md += '✅ No major risks identified\n\n'
  }

  md += '---\n\n'

  // Deletion order
  md += '## 7. ORDRE DE SUPPRESSION RECOMMANDÉ\n\n'
  md += '**IMPORTANT**: Cet ordre est recommandé mais AUCUNE suppression ne sera exécutée sans approbation explicite.\n\n'
  md += '1. VALUE_EVENTS (no dependencies)\n'
  md += '2. ACTIVITIES (depends on Opportunities)\n'
  md += '3. TASKS (depends on Opportunities)\n'
  md += '4. STAGE_HISTORY (depends on Opportunities)\n'
  md += '5. OPPORTUNITIES (depends on Companies/Contacts)\n'
  md += '6. CONTACTS (if orphaned and confirmed test)\n'
  md += '7. COMPANIES (if orphaned and confirmed test)\n\n'
  md += '---\n\n'

  // Backup plan
  md += '## 8. BACKUP PLAN\n\n'
  md += '**Local backup created**: `AIRTABLE_CLEANUP_BACKUP.json`\n\n'
  md += 'This file contains:\n'
  md += '- Full data for all DELETE_CANDIDATE records\n'
  md += '- Full data for all REVIEW records\n'
  md += '- All relationships preserved\n'
  md += '- Airtable IDs preserved\n'
  md += '- Timestamp of backup creation\n\n'
  md += '**Recovery procedure**: Manual reconstruction from JSON if needed\n\n'
  md += '---\n\n'

  // Final confirmation
  md += '## CONFIRMATION — READ-ONLY AUDIT\n\n'
  md += '**Airtable modifications during this preview**:\n\n'
  md += '| Operation | Count |\n'
  md += '|-----------|-------|\n'
  md += '| Records created | **0** |\n'
  md += '| Records modified | **0** |\n'
  md += '| Records deleted | **0** |\n'
  md += '| Schema changes | **0** |\n'
  md += '| Imports executed | **0** |\n\n'
  md += '✅ **Mission READ-ONLY strictly respected**\n\n'
  md += '---\n\n'

  md += `**Generated**: ${new Date().toISOString()}\n`
  md += `**Script**: \`scripts/airtable-cleanup-preview.ts\`\n`
  md += `**Backup**: \`AIRTABLE_CLEANUP_BACKUP.json\`\n`

  return md
}

function generateTableRow(tableName: string, stats: CleanupStats): string {
  return `| ${tableName} | ${stats.total} | ${stats.keep} | ${stats.deleteCandidate} | ${stats.review} |\n`
}

function displayTableSummary(tableName: string, stats: CleanupStats) {
  console.log(`${tableName}:`)
  console.log(`  Total: ${stats.total}`)
  console.log(`  KEEP: ${stats.keep}`)
  console.log(`  DELETE_CANDIDATE: ${stats.deleteCandidate}`)
  console.log(`  REVIEW: ${stats.review}`)
  console.log()
}

// ============================================================================
// EXECUTE
// ============================================================================

main()
