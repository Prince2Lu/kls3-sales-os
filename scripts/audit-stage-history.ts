// Audit STAGE_HISTORY records in Airtable
// Read-only script to identify records with missing Opportunity links

import 'dotenv/config'
import { config, getTableUrl, getHeaders, TABLE_NAMES } from '../lib/airtable/config'
import type { AirtableRecord, AirtableStageHistoryFields, AirtableListResponse } from '../lib/airtable/types'

async function fetchAllStageHistory(): Promise<AirtableRecord<AirtableStageHistoryFields>[]> {
  const url = getTableUrl(TABLE_NAMES.STAGE_HISTORY)
  const headers = getHeaders()

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.statusText}`)
  }

  const data = (await response.json()) as AirtableListResponse<AirtableStageHistoryFields>
  return data.records
}

async function auditStageHistory() {
  console.log('=== STAGE_HISTORY AUDIT ===\n')

  try {
    const records = await fetchAllStageHistory()
    const totalRecords = records.length

    let validRecords = 0
    let invalidRecords = 0
    const invalidRecordIds: string[] = []

    console.log(`Total STAGE_HISTORY records: ${totalRecords}\n`)

    records.forEach((record) => {
      const fields = record.fields
      const hasOpportunity = fields.Opportunity && fields.Opportunity.length > 0

      if (hasOpportunity) {
        validRecords++
      } else {
        invalidRecords++
        invalidRecordIds.push(record.id)
        console.log(`❌ Invalid record: ${record.id}`)
        console.log(`   - From Stage: ${fields['From Stage'] || 'null'}`)
        console.log(`   - To Stage: ${fields['To Stage']}`)
        console.log(`   - Changed At: ${fields['Changed At']}`)
        console.log(`   - Changed By: ${fields['Changed By']}`)
        console.log(`   - Opportunity: MISSING\n`)
      }
    })

    console.log('\n=== SUMMARY ===')
    console.log(`Total records: ${totalRecords}`)
    console.log(`Valid records (with Opportunity): ${validRecords}`)
    console.log(`Invalid records (without Opportunity): ${invalidRecords}`)

    if (invalidRecordIds.length > 0) {
      console.log(`\nInvalid record IDs:`)
      invalidRecordIds.forEach((id) => console.log(`  - ${id}`))
    }

    console.log('\n=== RECOMMENDATION ===')
    if (invalidRecords > 0) {
      console.log('⚠️  STAGE_HISTORY records without Opportunity link are INVALID for Analytics')
      console.log('✅ Recommended fix: Filter out records without Opportunity in getStageHistory()')
      console.log('✅ Add dev warning when encountering invalid records')
      console.log('❌ DO NOT create StageHistory objects with opportunityId: ""')
    } else {
      console.log('✅ All STAGE_HISTORY records are valid')
    }
  } catch (error) {
    console.error('Error auditing STAGE_HISTORY:', error)
    process.exit(1)
  }
}

auditStageHistory()
