/**
 * OPTIONAL BACKFILL SCRIPT
 *
 * Backfills Primary Business Line for existing companies based on their opportunities
 *
 * Logic:
 * - If all opportunities of a company have the same Business Line → Set as Primary
 * - If multiple different Business Lines → Skip (leave empty for manual assignment)
 * - If no opportunities → Skip (leave empty)
 *
 * IMPORTANT: This is a ONE-TIME script. Review audit report before executing.
 */

import 'dotenv/config'
import { getCompanies, getOpportunities, updateCompany } from '../lib/airtable/client'

interface BackfillCandidate {
  companyId: string
  companyName: string
  businessLineId: string
  opportunityCount: number
}

interface BackfillSummary {
  totalCompanies: number
  singleBusinessLine: BackfillCandidate[]
  multipleBusinessLines: string[]
  noOpportunities: string[]
  alreadyHasPrimary: string[]
}

async function analyzeBackfillCandidates(): Promise<BackfillSummary> {
  console.log('🔍 Analyzing companies for Primary Business Line backfill...\n')

  const [companies, opportunities] = await Promise.all([
    getCompanies({ maxRecords: 1000 }),
    getOpportunities({ maxRecords: 5000 }),
  ])

  const summary: BackfillSummary = {
    totalCompanies: companies.length,
    singleBusinessLine: [],
    multipleBusinessLines: [],
    noOpportunities: [],
    alreadyHasPrimary: [],
  }

  for (const company of companies) {
    // Skip if already has Primary Business Line
    if (company.primaryBusinessLineId) {
      summary.alreadyHasPrimary.push(company.name)
      continue
    }

    // Get all opportunities for this company
    const companyOpps = opportunities.filter((opp) => opp.companyId === company.id)

    if (companyOpps.length === 0) {
      summary.noOpportunities.push(company.name)
      continue
    }

    // Get unique Business Lines from opportunities
    const businessLineIds = new Set(companyOpps.map((opp) => opp.businessLineId))

    if (businessLineIds.size === 1) {
      // All opportunities have same Business Line → Candidate for backfill
      const businessLineId = Array.from(businessLineIds)[0]
      summary.singleBusinessLine.push({
        companyId: company.id,
        companyName: company.name,
        businessLineId,
        opportunityCount: companyOpps.length,
      })
    } else {
      // Multiple Business Lines → Skip (manual assignment needed)
      summary.multipleBusinessLines.push(
        `${company.name} (${businessLineIds.size} BLs)`
      )
    }
  }

  return summary
}

async function printAuditReport(summary: BackfillSummary) {
  console.log('📊 AUDIT REPORT — Primary Business Line Backfill\n')
  console.log('='.repeat(60))
  console.log(`Total companies: ${summary.totalCompanies}`)
  console.log('='.repeat(60))
  console.log()

  console.log(`✅ Already have Primary BL: ${summary.alreadyHasPrimary.length}`)
  if (summary.alreadyHasPrimary.length > 0 && summary.alreadyHasPrimary.length <= 10) {
    summary.alreadyHasPrimary.forEach((name) => console.log(`   - ${name}`))
  }
  console.log()

  console.log(`🎯 Candidates for backfill: ${summary.singleBusinessLine.length}`)
  console.log(`   (All opportunities have same Business Line)\n`)
  if (summary.singleBusinessLine.length > 0) {
    summary.singleBusinessLine.slice(0, 20).forEach((candidate) => {
      console.log(`   - ${candidate.companyName} → BL ID: ${candidate.businessLineId} (${candidate.opportunityCount} opps)`)
    })
    if (summary.singleBusinessLine.length > 20) {
      console.log(`   ... and ${summary.singleBusinessLine.length - 20} more`)
    }
  }
  console.log()

  console.log(`⚠️  Multiple Business Lines: ${summary.multipleBusinessLines.length}`)
  console.log(`   (Manual assignment recommended)\n`)
  if (summary.multipleBusinessLines.length > 0) {
    summary.multipleBusinessLines.slice(0, 10).forEach((name) => {
      console.log(`   - ${name}`)
    })
    if (summary.multipleBusinessLines.length > 10) {
      console.log(`   ... and ${summary.multipleBusinessLines.length - 10} more`)
    }
  }
  console.log()

  console.log(`ℹ️  No opportunities: ${summary.noOpportunities.length}`)
  console.log(`   (Cannot infer Business Line)\n`)
  if (summary.noOpportunities.length > 0 && summary.noOpportunities.length <= 15) {
    summary.noOpportunities.forEach((name) => console.log(`   - ${name}`))
  }
  console.log()
  console.log('='.repeat(60))
}

async function executeBackfill(candidates: BackfillCandidate[]) {
  console.log(`\n🚀 Executing backfill for ${candidates.length} companies...\n`)

  let successCount = 0
  let errorCount = 0

  for (const candidate of candidates) {
    try {
      await updateCompany(candidate.companyId, {
        primaryBusinessLineId: candidate.businessLineId,
      })
      successCount++
      console.log(`✅ ${candidate.companyName}`)
    } catch (error) {
      errorCount++
      console.error(`❌ ${candidate.companyName}: ${error}`)
    }
  }

  console.log()
  console.log('='.repeat(60))
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log('='.repeat(60))
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')

  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║  PRIMARY BUSINESS LINE BACKFILL SCRIPT                ║')
  console.log('╚═══════════════════════════════════════════════════════╝\n')

  if (dryRun) {
    console.log('ℹ️  DRY RUN MODE — No changes will be made')
    console.log('   Run with --execute to apply changes\n')
  } else {
    console.log('⚠️  EXECUTE MODE — Changes will be written to Airtable!\n')
  }

  try {
    const summary = await analyzeBackfillCandidates()
    await printAuditReport(summary)

    if (!dryRun) {
      console.log('\n⚠️  Proceeding with backfill in 3 seconds...\n')
      await new Promise((resolve) => setTimeout(resolve, 3000))
      await executeBackfill(summary.singleBusinessLine)
    } else {
      console.log('\n💡 To execute this backfill, run:')
      console.log('   npx tsx scripts/backfill-company-business-lines.ts --execute\n')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
