#!/usr/bin/env npx tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

async function main() {
  console.log('🔍 Testing COLD_CALL_TARGETS data access...\n')

  // Try to fetch records
  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/COLD_CALL_TARGETS`,
    {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    console.error('❌ Failed to fetch COLD_CALL_TARGETS:', response.status)
    const error = await response.text()
    console.error(error)
    process.exit(1)
  }

  const data = await response.json()

  console.log('✅ Successfully fetched COLD_CALL_TARGETS')
  console.log(`📊 Found ${data.records.length} records\n`)

  if (data.records.length === 0) {
    console.log('⚠️  No test data created yet')
    console.log('\nTo create test data, I need to:')
    console.log('1. Check existing COMPANIES')
    console.log('2. Check BUSINESS_LINES for PAUL and SACHA')
    console.log('3. Create 4 targets')
  } else {
    console.log('Existing targets:')
    data.records.forEach((record: any, i: number) => {
      console.log(`\n${i + 1}. ${record.fields.Name || record.id}`)
      console.log(`   Owner: ${record.fields.Owner}`)
      console.log(`   Call Status: ${record.fields['Call Status']}`)
      console.log(`   Has Company: ${!!record.fields.Company}`)
      console.log(`   Has Contact: ${!!record.fields.Contact}`)
      console.log(`   Has BL: ${!!record.fields['Business Line']}`)
    })
  }
}

main()
