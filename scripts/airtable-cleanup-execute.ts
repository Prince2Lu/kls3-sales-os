/**
 * AIRTABLE CLEANUP EXECUTION
 *
 * Mission: Delete validated test data from Airtable
 *
 * SAFETY GATES:
 * 1. Requires backup file AIRTABLE_CLEANUP_BACKUP.json
 * 2. Requires explicit --execute flag (else DRY-RUN)
 * 3. Requires environment variable CONFIRM_AIRTABLE_CLEANUP=DELETE_TEST_DATA
 * 4. Pre-flight checks on all records
 * 5. Never deletes USERS or BUSINESS_LINES
 * 6. Validates dependencies before deletion
 * 7. Post-cleanup verification
 *
 * USAGE:
 *   DRY-RUN:  npx tsx scripts/airtable-cleanup-execute.ts
 *   EXECUTE:  CONFIRM_AIRTABLE_CLEANUP=DELETE_TEST_DATA npx tsx scripts/airtable-cleanup-execute.ts --execute
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
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
  deleteCompany,
  deleteContact,
  deleteOpportunity,
  deleteActivity,
  deleteTask,
  deleteValueEvent,
} from '../lib/airtable/index.js'

// ============================================================================
// TYPES
// ============================================================================

interface BackupData {
  timestamp: string
  plan: {
    companies: { stats: any; records: any[] }
    contacts: { stats: any; records: any[] }
    opportunities: { stats: any; records: any[] }
    activities: { stats: any; records: any[] }
    tasks: { stats: any; records: any[] }
    valueEvents: { stats: any; records: any[] }
    stageHistory: { stats: any; records: any[] }
    goals: { stats: any; records: any[] }
    users: { stats: any; records: any[] }
    businessLines: { stats: any; records: any[] }
  }
  allRecords: any
}

interface DeletionPlan {
  valueEventIds: string[]
  activityIds: string[]
  taskIds: string[]
  opportunityIds: string[]
  contactIds: string[]
  companyIds: string[]
}

interface ExecutionLog {
  timestamp: string
  mode: 'DRY-RUN' | 'EXECUTE'
  backupFile: string
  backupTimestamp: string
  preFlightChecks: {
    backupExists: boolean
    confirmationEnvSet: boolean
    executeFlag: boolean
    totalRecordsExpected: number
    protectedUsers: number
    protectedBusinessLines: number
  }
  deletionPlan: DeletionPlan
  deletedRecords: {
    valueEvents: string[]
    activities: string[]
    tasks: string[]
    opportunities: string[]
    contacts: string[]
    companies: string[]
  }
  errors: string[]
  postCleanupVerification: {
    recordsDeleted: number
    usersRemaining: number
    businessLinesRemaining: number
    companiesRemaining: number
    contactsRemaining: number
    opportunitiesRemaining: number
    success: boolean
  }
}

// ============================================================================
// SAFETY CHECKS
// ============================================================================

function checkSafetyGates(executeMode: boolean): {
  passed: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Gate 1: Backup must exist
  const backupPath = resolve(__dirname, '../AIRTABLE_CLEANUP_BACKUP.json')
  if (!existsSync(backupPath)) {
    errors.push('❌ SAFETY GATE 1 FAILED: Backup file AIRTABLE_CLEANUP_BACKUP.json not found')
  }

  // Gate 2: Environment variable check (only if execute mode)
  if (executeMode) {
    const confirmation = process.env.CONFIRM_AIRTABLE_CLEANUP
    if (confirmation !== 'DELETE_TEST_DATA') {
      errors.push('❌ SAFETY GATE 2 FAILED: Environment variable CONFIRM_AIRTABLE_CLEANUP must be set to "DELETE_TEST_DATA"')
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  }
}

function loadBackup(): BackupData {
  const backupPath = resolve(__dirname, '../AIRTABLE_CLEANUP_BACKUP.json')
  const backupContent = readFileSync(backupPath, 'utf-8')
  return JSON.parse(backupContent)
}

function extractDeletionPlan(backup: BackupData): DeletionPlan {
  const plan: DeletionPlan = {
    valueEventIds: [],
    activityIds: [],
    taskIds: [],
    opportunityIds: [],
    contactIds: [],
    companyIds: [],
  }

  // Extract DELETE_CANDIDATE IDs from backup
  backup.plan.valueEvents.records
    .filter(r => r.classification === 'DELETE_CANDIDATE')
    .forEach(r => plan.valueEventIds.push(r.recordId))

  backup.plan.activities.records
    .filter(r => r.classification === 'DELETE_CANDIDATE')
    .forEach(r => plan.activityIds.push(r.recordId))

  backup.plan.tasks.records
    .filter(r => r.classification === 'DELETE_CANDIDATE')
    .forEach(r => plan.taskIds.push(r.recordId))

  backup.plan.opportunities.records
    .filter(r => r.classification === 'DELETE_CANDIDATE')
    .forEach(r => plan.opportunityIds.push(r.recordId))

  backup.plan.contacts.records
    .filter(r => r.classification === 'DELETE_CANDIDATE')
    .forEach(r => plan.contactIds.push(r.recordId))

  backup.plan.companies.records
    .filter(r => r.classification === 'DELETE_CANDIDATE')
    .forEach(r => plan.companyIds.push(r.recordId))

  return plan
}

// ============================================================================
// PRE-FLIGHT CHECKS
// ============================================================================

async function preFlightCheck(
  plan: DeletionPlan,
  backup: BackupData
): Promise<{ passed: boolean; errors: string[] }> {
  console.log('================================================================================')
  console.log('PRE-FLIGHT CHECKS')
  console.log('================================================================================')
  console.log()

  const errors: string[] = []

  // Check 1: Backup timestamp
  console.log(`✅ Backup exists: ${backup.timestamp}`)
  console.log()

  // Check 2: Total records expected
  const totalExpected =
    plan.valueEventIds.length +
    plan.activityIds.length +
    plan.taskIds.length +
    plan.opportunityIds.length +
    plan.contactIds.length +
    plan.companyIds.length

  console.log(`Total records to delete: ${totalExpected}`)
  console.log(`  - Value Events: ${plan.valueEventIds.length}`)
  console.log(`  - Activities: ${plan.activityIds.length}`)
  console.log(`  - Tasks: ${plan.taskIds.length}`)
  console.log(`  - Opportunities: ${plan.opportunityIds.length}`)
  console.log(`  - Contacts: ${plan.contactIds.length}`)
  console.log(`  - Companies: ${plan.companyIds.length}`)
  console.log()

  // Check 3: Fetch current Airtable data
  console.log('Fetching current Airtable data...')
  const currentBusinessLines = await getBusinessLines()
  const currentUsers = await getUsers()
  const currentCompanies = await getCompanies()
  const currentContacts = await getContacts()
  const currentOpportunities = await getOpportunities()
  const currentActivities = await getActivities()
  const currentTasks = await getTasks()
  const currentValueEvents = await getValueEvents()

  console.log('Current Airtable state:')
  console.log(`  - Business Lines: ${currentBusinessLines.length}`)
  console.log(`  - Users: ${currentUsers.length}`)
  console.log(`  - Companies: ${currentCompanies.length}`)
  console.log(`  - Contacts: ${currentContacts.length}`)
  console.log(`  - Opportunities: ${currentOpportunities.length}`)
  console.log(`  - Activities: ${currentActivities.length}`)
  console.log(`  - Tasks: ${currentTasks.length}`)
  console.log(`  - Value Events: ${currentValueEvents.length}`)
  console.log()

  // Check 4: Verify no USERS in deletion list
  const userIds = currentUsers.map(u => u.id)
  const allDeletionIds = [
    ...plan.valueEventIds,
    ...plan.activityIds,
    ...plan.taskIds,
    ...plan.opportunityIds,
    ...plan.contactIds,
    ...plan.companyIds,
  ]

  const userInDeletion = allDeletionIds.some(id => userIds.includes(id))
  if (userInDeletion) {
    errors.push('❌ SAFETY CHECK FAILED: USER found in deletion list - ABORT')
  } else {
    console.log(`✅ No USERS in deletion list (${currentUsers.length} protected)`)
  }

  // Check 5: Verify no BUSINESS_LINES in deletion list
  const businessLineIds = currentBusinessLines.map(bl => bl.id)
  const businessLineInDeletion = allDeletionIds.some(id => businessLineIds.includes(id))
  if (businessLineInDeletion) {
    errors.push('❌ SAFETY CHECK FAILED: BUSINESS_LINE found in deletion list - ABORT')
  } else {
    console.log(`✅ No BUSINESS_LINES in deletion list (${currentBusinessLines.length} protected)`)
  }

  // Check 6: Verify KLS3_NOTAIRES exists and protected
  const kls3Notaires = currentBusinessLines.find(bl => bl.code === 'KLS3_NOTAIRES')
  if (!kls3Notaires) {
    errors.push('❌ SAFETY CHECK FAILED: KLS3_NOTAIRES business line not found - ABORT')
  } else {
    console.log(`✅ KLS3_NOTAIRES protected (${kls3Notaires.id})`)
  }

  // Check 7: Verify all deletion IDs exist in current Airtable
  console.log()
  console.log('Verifying deletion IDs exist in Airtable...')

  const currentValueEventIds = currentValueEvents.map(ve => ve.id)
  const missingValueEvents = plan.valueEventIds.filter(id => !currentValueEventIds.includes(id))
  if (missingValueEvents.length > 0) {
    errors.push(`⚠️  WARNING: ${missingValueEvents.length} Value Events not found (may have been deleted already)`)
  }

  const currentActivityIds = currentActivities.map(a => a.id)
  const missingActivities = plan.activityIds.filter(id => !currentActivityIds.includes(id))
  if (missingActivities.length > 0) {
    errors.push(`⚠️  WARNING: ${missingActivities.length} Activities not found (may have been deleted already)`)
  }

  const currentTaskIds = currentTasks.map(t => t.id)
  const missingTasks = plan.taskIds.filter(id => !currentTaskIds.includes(id))
  if (missingTasks.length > 0) {
    errors.push(`⚠️  WARNING: ${missingTasks.length} Tasks not found (may have been deleted already)`)
  }

  const currentOpportunityIds = currentOpportunities.map(o => o.id)
  const missingOpportunities = plan.opportunityIds.filter(id => !currentOpportunityIds.includes(id))
  if (missingOpportunities.length > 0) {
    errors.push(`⚠️  WARNING: ${missingOpportunities.length} Opportunities not found (may have been deleted already)`)
  }

  const currentContactIds = currentContacts.map(c => c.id)
  const missingContacts = plan.contactIds.filter(id => !currentContactIds.includes(id))
  if (missingContacts.length > 0) {
    errors.push(`⚠️  WARNING: ${missingContacts.length} Contacts not found (may have been deleted already)`)
  }

  const currentCompanyIds = currentCompanies.map(c => c.id)
  const missingCompanies = plan.companyIds.filter(id => !currentCompanyIds.includes(id))
  if (missingCompanies.length > 0) {
    errors.push(`⚠️  WARNING: ${missingCompanies.length} Companies not found (may have been deleted already)`)
  }

  const totalMissing =
    missingValueEvents.length +
    missingActivities.length +
    missingTasks.length +
    missingOpportunities.length +
    missingContacts.length +
    missingCompanies.length

  if (totalMissing === 0) {
    console.log('✅ All deletion IDs exist in Airtable')
  } else {
    console.log(`⚠️  ${totalMissing} records missing from Airtable (may be OK if previously deleted)`)
  }

  console.log()

  return {
    passed: errors.filter(e => e.startsWith('❌')).length === 0,
    errors,
  }
}

// ============================================================================
// DELETION EXECUTION
// ============================================================================

async function executeDeletion(
  plan: DeletionPlan,
  dryRun: boolean
): Promise<{ deleted: ExecutionLog['deletedRecords']; errors: string[] }> {
  const deleted: ExecutionLog['deletedRecords'] = {
    valueEvents: [],
    activities: [],
    tasks: [],
    opportunities: [],
    contacts: [],
    companies: [],
  }

  const errors: string[] = []

  console.log('================================================================================')
  console.log(dryRun ? 'DRY-RUN MODE (no deletions will be made)' : 'EXECUTION MODE (deletions will be made)')
  console.log('================================================================================')
  console.log()

  // Order: VALUE_EVENTS → ACTIVITIES → TASKS → OPPORTUNITIES → CONTACTS → COMPANIES

  // Step 1: Delete VALUE_EVENTS
  console.log(`Step 1: Deleting ${plan.valueEventIds.length} Value Events...`)
  for (const id of plan.valueEventIds) {
    try {
      if (!dryRun) {
        await deleteValueEvent(id)
      }
      deleted.valueEvents.push(id)
      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete Value Event: ${id}`)
      }
    } catch (error) {
      const errorMsg = `Failed to delete Value Event ${id}: ${error}`
      errors.push(errorMsg)
      console.error(`  ❌ ${errorMsg}`)
    }
  }
  console.log(`  ${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'} ${deleted.valueEvents.length} Value Events`)
  console.log()

  // Step 2: Delete ACTIVITIES
  console.log(`Step 2: Deleting ${plan.activityIds.length} Activities...`)
  for (const id of plan.activityIds) {
    try {
      if (!dryRun) {
        await deleteActivity(id)
      }
      deleted.activities.push(id)
      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete Activity: ${id}`)
      }
    } catch (error) {
      const errorMsg = `Failed to delete Activity ${id}: ${error}`
      errors.push(errorMsg)
      console.error(`  ❌ ${errorMsg}`)
    }
  }
  console.log(`  ${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'} ${deleted.activities.length} Activities`)
  console.log()

  // Step 3: Delete TASKS
  console.log(`Step 3: Deleting ${plan.taskIds.length} Tasks...`)
  for (const id of plan.taskIds) {
    try {
      if (!dryRun) {
        await deleteTask(id)
      }
      deleted.tasks.push(id)
      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete Task: ${id}`)
      }
    } catch (error) {
      const errorMsg = `Failed to delete Task ${id}: ${error}`
      errors.push(errorMsg)
      console.error(`  ❌ ${errorMsg}`)
    }
  }
  console.log(`  ${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'} ${deleted.tasks.length} Tasks`)
  console.log()

  // Step 4: Delete OPPORTUNITIES
  console.log(`Step 4: Deleting ${plan.opportunityIds.length} Opportunities...`)
  for (const id of plan.opportunityIds) {
    try {
      if (!dryRun) {
        await deleteOpportunity(id)
      }
      deleted.opportunities.push(id)
      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete Opportunity: ${id}`)
      }
    } catch (error) {
      const errorMsg = `Failed to delete Opportunity ${id}: ${error}`
      errors.push(errorMsg)
      console.error(`  ❌ ${errorMsg}`)
    }
  }
  console.log(`  ${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'} ${deleted.opportunities.length} Opportunities`)
  console.log()

  // Step 5: Delete CONTACTS
  console.log(`Step 5: Deleting ${plan.contactIds.length} Contacts...`)
  for (const id of plan.contactIds) {
    try {
      if (!dryRun) {
        await deleteContact(id)
      }
      deleted.contacts.push(id)
      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete Contact: ${id}`)
      }
    } catch (error) {
      const errorMsg = `Failed to delete Contact ${id}: ${error}`
      errors.push(errorMsg)
      console.error(`  ❌ ${errorMsg}`)
    }
  }
  console.log(`  ${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'} ${deleted.contacts.length} Contacts`)
  console.log()

  // Step 6: Delete COMPANIES
  console.log(`Step 6: Deleting ${plan.companyIds.length} Companies...`)
  for (const id of plan.companyIds) {
    try {
      if (!dryRun) {
        await deleteCompany(id)
      }
      deleted.companies.push(id)
      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete Company: ${id}`)
      }
    } catch (error) {
      const errorMsg = `Failed to delete Company ${id}: ${error}`
      errors.push(errorMsg)
      console.error(`  ❌ ${errorMsg}`)
    }
  }
  console.log(`  ${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'} ${deleted.companies.length} Companies`)
  console.log()

  return { deleted, errors }
}

// ============================================================================
// POST-CLEANUP VERIFICATION
// ============================================================================

async function postCleanupVerification(
  deletedRecords: ExecutionLog['deletedRecords'],
  dryRun: boolean
): Promise<ExecutionLog['postCleanupVerification']> {
  console.log('================================================================================')
  console.log('POST-CLEANUP VERIFICATION')
  console.log('================================================================================')
  console.log()

  if (dryRun) {
    console.log('[DRY-RUN] Skipping post-cleanup verification (no actual deletions made)')
    console.log()
    return {
      recordsDeleted: 0,
      usersRemaining: 0,
      businessLinesRemaining: 0,
      companiesRemaining: 0,
      contactsRemaining: 0,
      opportunitiesRemaining: 0,
      success: true,
    }
  }

  // Fetch current state after deletion
  const currentBusinessLines = await getBusinessLines()
  const currentUsers = await getUsers()
  const currentCompanies = await getCompanies()
  const currentContacts = await getContacts()
  const currentOpportunities = await getOpportunities()
  const currentActivities = await getActivities()
  const currentTasks = await getTasks()
  const currentValueEvents = await getValueEvents()

  console.log('Airtable state after cleanup:')
  console.log(`  - Business Lines: ${currentBusinessLines.length}`)
  console.log(`  - Users: ${currentUsers.length}`)
  console.log(`  - Companies: ${currentCompanies.length}`)
  console.log(`  - Contacts: ${currentContacts.length}`)
  console.log(`  - Opportunities: ${currentOpportunities.length}`)
  console.log(`  - Activities: ${currentActivities.length}`)
  console.log(`  - Tasks: ${currentTasks.length}`)
  console.log(`  - Value Events: ${currentValueEvents.length}`)
  console.log()

  // Verify critical records still exist
  let success = true

  if (currentUsers.length !== 2) {
    console.error(`❌ VERIFICATION FAILED: Expected 2 Users, found ${currentUsers.length}`)
    success = false
  } else {
    console.log('✅ Users intact (2)')
  }

  if (currentBusinessLines.length !== 4) {
    console.error(`❌ VERIFICATION FAILED: Expected 4 Business Lines, found ${currentBusinessLines.length}`)
    success = false
  } else {
    console.log('✅ Business Lines intact (4)')
  }

  const kls3Notaires = currentBusinessLines.find(bl => bl.code === 'KLS3_NOTAIRES')
  if (!kls3Notaires) {
    console.error('❌ VERIFICATION FAILED: KLS3_NOTAIRES not found')
    success = false
  } else {
    console.log('✅ KLS3_NOTAIRES intact')
  }

  // Verify deleted records are gone
  const allDeletedIds = [
    ...deletedRecords.valueEvents,
    ...deletedRecords.activities,
    ...deletedRecords.tasks,
    ...deletedRecords.opportunities,
    ...deletedRecords.contacts,
    ...deletedRecords.companies,
  ]

  const currentAllIds = [
    ...currentValueEvents.map(ve => ve.id),
    ...currentActivities.map(a => a.id),
    ...currentTasks.map(t => t.id),
    ...currentOpportunities.map(o => o.id),
    ...currentContacts.map(c => c.id),
    ...currentCompanies.map(c => c.id),
  ]

  const stillExist = allDeletedIds.filter(id => currentAllIds.includes(id))
  if (stillExist.length > 0) {
    console.error(`❌ VERIFICATION FAILED: ${stillExist.length} deleted records still exist`)
    success = false
  } else {
    console.log(`✅ All deleted records verified removed (${allDeletedIds.length})`)
  }

  console.log()

  return {
    recordsDeleted: allDeletedIds.length,
    usersRemaining: currentUsers.length,
    businessLinesRemaining: currentBusinessLines.length,
    companiesRemaining: currentCompanies.length,
    contactsRemaining: currentContacts.length,
    opportunitiesRemaining: currentOpportunities.length,
    success,
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('================================================================================')
  console.log('AIRTABLE CLEANUP EXECUTION')
  console.log('================================================================================')
  console.log()

  // Parse command line arguments
  const args = process.argv.slice(2)
  const executeMode = args.includes('--execute')
  const dryRun = !executeMode

  console.log(`Mode: ${dryRun ? 'DRY-RUN (no deletions)' : 'EXECUTE (real deletions)'}`)
  console.log()

  // Initialize execution log
  const executionLog: ExecutionLog = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'DRY-RUN' : 'EXECUTE',
    backupFile: 'AIRTABLE_CLEANUP_BACKUP.json',
    backupTimestamp: '',
    preFlightChecks: {
      backupExists: false,
      confirmationEnvSet: false,
      executeFlag: executeMode,
      totalRecordsExpected: 0,
      protectedUsers: 0,
      protectedBusinessLines: 0,
    },
    deletionPlan: {
      valueEventIds: [],
      activityIds: [],
      taskIds: [],
      opportunityIds: [],
      contactIds: [],
      companyIds: [],
    },
    deletedRecords: {
      valueEvents: [],
      activities: [],
      tasks: [],
      opportunities: [],
      contacts: [],
      companies: [],
    },
    errors: [],
    postCleanupVerification: {
      recordsDeleted: 0,
      usersRemaining: 0,
      businessLinesRemaining: 0,
      companiesRemaining: 0,
      contactsRemaining: 0,
      opportunitiesRemaining: 0,
      success: false,
    },
  }

  try {
    // Step 1: Safety Gates
    console.log('Step 1: Checking safety gates...')
    const safetyCheck = checkSafetyGates(executeMode)
    if (!safetyCheck.passed) {
      console.error()
      console.error('SAFETY GATES FAILED:')
      safetyCheck.errors.forEach(error => console.error(error))
      console.error()
      console.error('ABORT: Cannot proceed with cleanup')
      executionLog.errors.push(...safetyCheck.errors)
      return
    }
    console.log('✅ All safety gates passed')
    console.log()

    // Step 2: Load backup
    console.log('Step 2: Loading backup...')
    const backup = loadBackup()
    executionLog.backupTimestamp = backup.timestamp
    console.log(`✅ Backup loaded: ${backup.timestamp}`)
    console.log()

    // Step 3: Extract deletion plan
    console.log('Step 3: Extracting deletion plan from backup...')
    const deletionPlan = extractDeletionPlan(backup)
    executionLog.deletionPlan = deletionPlan

    const totalRecords =
      deletionPlan.valueEventIds.length +
      deletionPlan.activityIds.length +
      deletionPlan.taskIds.length +
      deletionPlan.opportunityIds.length +
      deletionPlan.contactIds.length +
      deletionPlan.companyIds.length

    executionLog.preFlightChecks.totalRecordsExpected = totalRecords
    console.log(`✅ Deletion plan extracted: ${totalRecords} records`)
    console.log()

    // Step 4: Pre-flight checks
    const preFlightResult = await preFlightCheck(deletionPlan, backup)
    if (!preFlightResult.passed) {
      console.error('PRE-FLIGHT CHECKS FAILED:')
      preFlightResult.errors.forEach(error => console.error(error))
      console.error()
      console.error('ABORT: Cannot proceed with cleanup')
      executionLog.errors.push(...preFlightResult.errors)
      return
    }

    // Show warnings but allow to continue
    const warnings = preFlightResult.errors.filter(e => e.startsWith('⚠️'))
    if (warnings.length > 0) {
      console.log('WARNINGS:')
      warnings.forEach(warning => console.log(warning))
      console.log()
    }

    console.log('✅ Pre-flight checks passed')
    console.log()

    // Step 5: Execute deletion
    const { deleted, errors: deletionErrors } = await executeDeletion(deletionPlan, dryRun)
    executionLog.deletedRecords = deleted
    executionLog.errors.push(...deletionErrors)

    if (deletionErrors.length > 0) {
      console.error('DELETION ERRORS:')
      deletionErrors.forEach(error => console.error(error))
      console.error()
    }

    // Step 6: Post-cleanup verification
    const verification = await postCleanupVerification(deleted, dryRun)
    executionLog.postCleanupVerification = verification

    // Step 7: Generate execution log
    const logPath = resolve(__dirname, '../AIRTABLE_CLEANUP_EXECUTION_LOG.md')
    const logMarkdown = generateExecutionLog(executionLog)
    writeFileSync(logPath, logMarkdown, 'utf-8')
    console.log(`✅ Execution log saved: ${logPath}`)
    console.log()

    // Final summary
    console.log('================================================================================')
    console.log('CLEANUP SUMMARY')
    console.log('================================================================================')
    console.log()
    console.log(`Mode: ${executionLog.mode}`)
    console.log(`Records deleted: ${dryRun ? 0 : executionLog.postCleanupVerification.recordsDeleted}`)
    console.log(`Errors: ${executionLog.errors.length}`)
    console.log()

    if (dryRun) {
      console.log('DRY-RUN COMPLETE')
      console.log()
      console.log('To execute real cleanup, run:')
      console.log('CONFIRM_AIRTABLE_CLEANUP=DELETE_TEST_DATA npx tsx scripts/airtable-cleanup-execute.ts --execute')
    } else {
      if (verification.success) {
        console.log('✅ CLEANUP SUCCESS')
      } else {
        console.log('❌ CLEANUP COMPLETED WITH ERRORS')
      }
    }

    console.log()
    console.log('CONFIRMATION:')
    console.log(`  Airtable records deleted: ${dryRun ? 0 : executionLog.postCleanupVerification.recordsDeleted}`)
    console.log(`  Cleanup mode: ${executionLog.mode}`)
    console.log(`  Ready for explicit execution approval: ${dryRun && preFlightResult.passed ? 'YES' : 'N/A'}`)
  } catch (error) {
    console.error()
    console.error('FATAL ERROR:', error)
    executionLog.errors.push(`FATAL ERROR: ${error}`)
  }
}

// ============================================================================
// LOG GENERATION
// ============================================================================

function generateExecutionLog(log: ExecutionLog): string {
  let md = '# AIRTABLE CLEANUP EXECUTION LOG\n\n'
  md += `**Timestamp**: ${log.timestamp}\n`
  md += `**Mode**: ${log.mode}\n`
  md += `**Backup**: ${log.backupFile} (${log.backupTimestamp})\n\n`
  md += '---\n\n'

  md += '## PRE-FLIGHT CHECKS\n\n'
  md += `- Backup exists: ${log.preFlightChecks.backupExists ? '✅' : '❌'}\n`
  md += `- Confirmation env set: ${log.preFlightChecks.confirmationEnvSet ? '✅' : '❌'}\n`
  md += `- Execute flag: ${log.preFlightChecks.executeFlag ? '✅' : '❌ (DRY-RUN)'}\n`
  md += `- Total records expected: ${log.preFlightChecks.totalRecordsExpected}\n`
  md += `- Protected users: ${log.preFlightChecks.protectedUsers}\n`
  md += `- Protected business lines: ${log.preFlightChecks.protectedBusinessLines}\n\n`
  md += '---\n\n'

  md += '## DELETION PLAN\n\n'
  md += `- Value Events: ${log.deletionPlan.valueEventIds.length}\n`
  md += `- Activities: ${log.deletionPlan.activityIds.length}\n`
  md += `- Tasks: ${log.deletionPlan.taskIds.length}\n`
  md += `- Opportunities: ${log.deletionPlan.opportunityIds.length}\n`
  md += `- Contacts: ${log.deletionPlan.contactIds.length}\n`
  md += `- Companies: ${log.deletionPlan.companyIds.length}\n\n`
  md += '---\n\n'

  md += '## DELETED RECORDS\n\n'
  md += `- Value Events: ${log.deletedRecords.valueEvents.length}\n`
  md += `- Activities: ${log.deletedRecords.activities.length}\n`
  md += `- Tasks: ${log.deletedRecords.tasks.length}\n`
  md += `- Opportunities: ${log.deletedRecords.opportunities.length}\n`
  md += `- Contacts: ${log.deletedRecords.contacts.length}\n`
  md += `- Companies: ${log.deletedRecords.companies.length}\n\n`

  if (log.mode === 'EXECUTE') {
    md += '### Record IDs Deleted\n\n'
    if (log.deletedRecords.valueEvents.length > 0) {
      md += '**Value Events**:\n'
      log.deletedRecords.valueEvents.forEach(id => md += `- ${id}\n`)
      md += '\n'
    }
    if (log.deletedRecords.activities.length > 0) {
      md += '**Activities**:\n'
      log.deletedRecords.activities.forEach(id => md += `- ${id}\n`)
      md += '\n'
    }
    if (log.deletedRecords.tasks.length > 0) {
      md += '**Tasks**:\n'
      log.deletedRecords.tasks.forEach(id => md += `- ${id}\n`)
      md += '\n'
    }
    if (log.deletedRecords.opportunities.length > 0) {
      md += '**Opportunities**:\n'
      log.deletedRecords.opportunities.forEach(id => md += `- ${id}\n`)
      md += '\n'
    }
    if (log.deletedRecords.contacts.length > 0) {
      md += '**Contacts**:\n'
      log.deletedRecords.contacts.forEach(id => md += `- ${id}\n`)
      md += '\n'
    }
    if (log.deletedRecords.companies.length > 0) {
      md += '**Companies**:\n'
      log.deletedRecords.companies.forEach(id => md += `- ${id}\n`)
      md += '\n'
    }
  }

  md += '---\n\n'

  if (log.errors.length > 0) {
    md += '## ERRORS\n\n'
    log.errors.forEach(error => md += `- ${error}\n`)
    md += '\n---\n\n'
  }

  md += '## POST-CLEANUP VERIFICATION\n\n'
  md += `- Records deleted: ${log.postCleanupVerification.recordsDeleted}\n`
  md += `- Users remaining: ${log.postCleanupVerification.usersRemaining}\n`
  md += `- Business Lines remaining: ${log.postCleanupVerification.businessLinesRemaining}\n`
  md += `- Companies remaining: ${log.postCleanupVerification.companiesRemaining}\n`
  md += `- Contacts remaining: ${log.postCleanupVerification.contactsRemaining}\n`
  md += `- Opportunities remaining: ${log.postCleanupVerification.opportunitiesRemaining}\n`
  md += `- Success: ${log.postCleanupVerification.success ? '✅' : '❌'}\n\n`
  md += '---\n\n'

  md += `**Generated**: ${new Date().toISOString()}\n`
  md += `**Script**: \`scripts/airtable-cleanup-execute.ts\`\n`

  return md
}

// ============================================================================
// EXECUTE
// ============================================================================

main()
