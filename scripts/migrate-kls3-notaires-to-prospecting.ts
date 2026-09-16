// Migration: Convert KLS3_NOTAIRES Opportunities (stage À prospecter) to ProspectingTargets
// CRITICAL: Only run with --execute flag after reviewing dry-run output
//
// SAFETY:
// - Dry-run by default (--execute required)
// - Idempotent (can be re-run safely)
// - Creates backup JSON before execution
// - Find/reuse existing ProspectingTargets by Company + Business Line
// - Only deletes Opportunity AFTER ProspectingTarget created

import { getOpportunities, getBusinessLines, createColdCallTarget, deleteOpportunity, getColdCallTargets } from '@/lib/airtable'
import * as fs from 'fs'
import * as path from 'path'

const DRY_RUN_DEFAULT = true
const BACKUP_DIR = path.join(process.cwd(), 'backups')

interface MigrationResult {
  success: boolean
  opportunityId: string
  companyId: string
  contactId: string | null
  companyName: string
  error?: string
  prospectingTargetId?: string
}

async function migrateKLS3NotairesToProspecting(dryRun: boolean = DRY_RUN_DEFAULT) {
  console.log('='.repeat(80))
  console.log('KLS3_NOTAIRES OPPORTUNITIES → PROSPECTING TARGETS MIGRATION')
  console.log('='.repeat(80))
  console.log('')
  console.log(`MODE: ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '⚠️  EXECUTE (will modify Airtable data)'}`)
  console.log('')

  try {
    // 0. Create backup (if executing)
    let backupPath: string | null = null
    if (!dryRun) {
      console.log('Creating backup before migration...')
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true })
      }
      backupPath = path.join(BACKUP_DIR, `kls3-notaires-opportunities-${Date.now()}.json`)
    }
    // 1. Get KLS3_NOTAIRES Business Line
    const businessLines = await getBusinessLines()
    const kls3NotairesBL = businessLines.find(bl => bl.code === 'KLS3_NOTAIRES')

    if (!kls3NotairesBL) {
      throw new Error('KLS3_NOTAIRES Business Line not found')
    }

    console.log(`✓ Found KLS3_NOTAIRES Business Line (ID: ${kls3NotairesBL.id})`)
    console.log(`  Prospecting Mode: ${kls3NotairesBL.prospectingMode}`)
    console.log('')

    // 2. Get all KLS3_NOTAIRES Opportunities in stage 'À prospecter'
    const allOpportunities = await getOpportunities({
      businessLineId: kls3NotairesBL.id,
    })

    const prospectingOpportunities = allOpportunities.filter(
      opp => opp.stage === 'À prospecter'
    )

    console.log(`Found ${allOpportunities.length} total KLS3_NOTAIRES Opportunities`)
    console.log(`  → ${prospectingOpportunities.length} in stage 'À prospecter' (candidates for migration)`)
    console.log(`  → ${allOpportunities.length - prospectingOpportunities.length} in other stages (will NOT be migrated)`)
    console.log('')

    if (prospectingOpportunities.length === 0) {
      console.log('✓ No opportunities to migrate')
      return
    }

    // Save backup of opportunities to migrate (if executing)
    if (!dryRun && backupPath) {
      const backupData = {
        timestamp: new Date().toISOString(),
        businessLineId: kls3NotairesBL.id,
        businessLineCode: 'KLS3_NOTAIRES',
        opportunities: prospectingOpportunities.map(opp => ({
          id: opp.id,
          name: opp.name,
          companyId: opp.companyId,
          primaryContactId: opp.primaryContactId,
          owner: opp.owner,
          stage: opp.stage,
          source: opp.source,
          priority: opp.priority,
          potentialValue: opp.potentialValue,
          probability: opp.probability,
          expectedCloseDate: opp.expectedCloseDate,
          problem: opp.problem,
          need: opp.need,
          nextStepNotes: opp.nextStepNotes,
          createdAt: opp.createdAt,
          updatedAt: opp.updatedAt,
        })),
      }
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8')
      console.log(`✓ Backup saved to: ${backupPath}`)
      console.log('')
    }

    // 2b. Get existing ProspectingTargets for KLS3_NOTAIRES (for idempotence check)
    console.log('Checking for existing ProspectingTargets...')
    const existingTargets = await getColdCallTargets({
      businessLineId: kls3NotairesBL.id,
    })
    console.log(`Found ${existingTargets.length} existing ProspectingTargets for KLS3_NOTAIRES`)
    console.log('')

    // 3. Validate candidates
    console.log('Validating migration candidates...')
    console.log('')

    const { getCompanyById } = await import('@/lib/airtable')
    const results: MigrationResult[] = []

    for (const opp of prospectingOpportunities) {
      try {
        // Validation: must have companyId
        if (!opp.companyId) {
          results.push({
            success: false,
            opportunityId: opp.id,
            companyId: '',
            contactId: null,
            companyName: opp.name,
            error: 'Missing companyId (required)',
          })
          continue
        }

        // Get company name for display
        const company = await getCompanyById(opp.companyId)

        results.push({
          success: true,
          opportunityId: opp.id,
          companyId: opp.companyId,
          contactId: opp.primaryContactId,
          companyName: company.name,
        })
      } catch (error: any) {
        results.push({
          success: false,
          opportunityId: opp.id,
          companyId: opp.companyId || '',
          contactId: null,
          companyName: opp.name,
          error: error.message,
        })
      }
    }

    // 4. Display validation results
    const validResults = results.filter(r => r.success)
    const invalidResults = results.filter(r => !r.success)

    console.log(`Validation complete:`)
    console.log(`  ✓ ${validResults.length} valid candidates`)
    console.log(`  ✗ ${invalidResults.length} invalid candidates`)
    console.log('')

    if (invalidResults.length > 0) {
      console.log('⚠️  Invalid candidates (will be skipped):')
      console.log('')
      invalidResults.forEach(r => {
        console.log(`  ✗ ${r.companyName}`)
        console.log(`    Opportunity ID: ${r.opportunityId}`)
        console.log(`    Error: ${r.error}`)
        console.log('')
      })
    }

    if (validResults.length === 0) {
      console.log('No valid candidates to migrate')
      return
    }

    // 5. Preview migration plan
    console.log('='.repeat(80))
    console.log('MIGRATION PLAN')
    console.log('='.repeat(80))
    console.log('')
    console.log(`Will migrate ${validResults.length} Opportunities to ProspectingTargets:`)
    console.log('')

    validResults.forEach((r, index) => {
      console.log(`${index + 1}. ${r.companyName}`)
      console.log(`   Opportunity ID: ${r.opportunityId}`)
      console.log(`   Company ID: ${r.companyId}`)
      console.log(`   Contact ID: ${r.contactId || 'none'}`)
      console.log(`   → Will create ProspectingTarget with status: 'À contacter'`)
      console.log(`   → Will delete Opportunity after successful creation`)
      console.log('')
    })

    // 6. Execute migration (only if not dry run)
    if (!dryRun) {
      console.log('='.repeat(80))
      console.log('⚠️  EXECUTING MIGRATION')
      console.log('='.repeat(80))
      console.log('')

      let successCount = 0
      let errorCount = 0

      for (const result of validResults) {
        try {
          // IDEMPOTENCE: Check if ProspectingTarget already exists for this Company + Business Line
          const existingTarget = existingTargets.find(
            t => t.companyId === result.companyId && t.businessLineId === kls3NotairesBL.id
          )

          let prospectingTarget
          if (existingTarget) {
            console.log(`⚠️  ProspectingTarget already exists for ${result.companyName}`)
            console.log(`  ID: ${existingTarget.id}`)
            console.log(`  → Skipping creation, will only delete Opportunity`)
            prospectingTarget = existingTarget
          } else {
            // Create ProspectingTarget (using createColdCallTarget - backward compatibility)
            prospectingTarget = await createColdCallTarget({
              companyId: result.companyId,
              contactId: result.contactId ?? undefined,
              businessLineId: kls3NotairesBL.id,
              owner: 'Eric', // Default owner for KLS3_NOTAIRES
              callStatus: 'À appeler', // LEGACY value (will be mapped by code to 'À contacter')
            })

            console.log(`✓ Created ProspectingTarget for ${result.companyName}`)
            console.log(`  ID: ${prospectingTarget.id}`)
          }

          // Delete original Opportunity (only if ProspectingTarget was created/found successfully)
          await deleteOpportunity(result.opportunityId)
          console.log(`✓ Deleted Opportunity ${result.opportunityId}`)
          console.log('')

          result.prospectingTargetId = prospectingTarget.id
          successCount++
        } catch (error: any) {
          console.log(`✗ Failed to migrate ${result.companyName}`)
          console.log(`  Error: ${error.message}`)
          console.log('')
          result.error = error.message
          errorCount++
        }
      }

      console.log('='.repeat(80))
      console.log('MIGRATION COMPLETE')
      console.log('='.repeat(80))
      console.log('')
      console.log(`✓ Successfully migrated: ${successCount}`)
      console.log(`✗ Failed: ${errorCount}`)
      console.log('')

      // 7. Rollback instructions
      if (successCount > 0) {
        console.log('ROLLBACK INSTRUCTIONS (if needed):')
        console.log('')
        console.log('To rollback this migration:')
        console.log('1. Use the backup file to restore deleted Opportunities:')
        if (backupPath) {
          console.log(`   ${backupPath}`)
        }
        console.log('2. Manually delete created ProspectingTargets from Airtable')
        console.log('   (or use script: scripts/rollback-kls3-notaires-migration.ts)')
        console.log('')
        console.log('⚠️  Airtable does not support transaction rollback.')
        console.log('⚠️  Backup is your only safety net!')
        console.log('')
      }
    } else {
      console.log('='.repeat(80))
      console.log('🔍 DRY RUN COMPLETE - NO CHANGES MADE')
      console.log('='.repeat(80))
      console.log('')
      console.log('To execute this migration, run:')
      console.log('  npm run ts-node scripts/migrate-kls3-notaires-to-prospecting.ts -- --execute')
      console.log('')
      console.log('⚠️  WARNING: This will permanently modify Airtable data!')
      console.log('⚠️  Ensure you have reviewed the migration plan above.')
      console.log('')
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

// CLI execution
const args = process.argv.slice(2)
const dryRun = !args.includes('--execute')

migrateKLS3NotairesToProspecting(dryRun)
  .then(() => {
    console.log('Script complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
