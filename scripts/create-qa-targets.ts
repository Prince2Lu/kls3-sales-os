#!/usr/bin/env npx tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

async function fetchRecords(tableName: string) {
  const response = await fetch(`${BASE_URL}/${tableName}`, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` },
  })
  const data = await response.json()
  return data.records
}

async function createRecord(tableName: string, fields: any) {
  const response = await fetch(`${BASE_URL}/${tableName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create record: ${error}`)
  }

  return await response.json()
}

async function main() {
  console.log('🔍 Checking existing data...\n')

  // Fetch business lines
  const businessLines = await fetchRecords('BUSINESS_LINES')
  const paulBL = businessLines.find((bl: any) => bl.fields.Code === 'PAUL')
  const sachaBL = businessLines.find((bl: any) => bl.fields.Code === 'SACHA')

  if (!paulBL || !sachaBL) {
    console.error('❌ Missing PAUL or SACHA business lines')
    process.exit(1)
  }

  console.log('✅ Business Lines found:')
  console.log(`   PAUL: ${paulBL.fields.Name} (${paulBL.id})`)
  console.log(`   SACHA: ${sachaBL.fields.Name} (${sachaBL.id})`)

  // Fetch companies
  const companies = await fetchRecords('COMPANIES')

  if (companies.length < 4) {
    console.error(`❌ Need at least 4 companies, found ${companies.length}`)
    console.error('Cannot create QA targets without enough companies')
    process.exit(1)
  }

  console.log(`\n✅ Found ${companies.length} companies`)

  // Use first 4 companies
  const selectedCompanies = companies.slice(0, 4)

  console.log('\n📋 Using companies:')
  selectedCompanies.forEach((c: any, i: number) => {
    console.log(`   ${i + 1}. ${c.fields.Name}`)
  })

  // Fetch contacts (optional)
  const contacts = await fetchRecords('CONTACTS')
  const selectedContacts = contacts.slice(0, 3) // Only 3, leave 1 without

  console.log(`\n✅ Found ${contacts.length} contacts`)
  console.log('Using 3 contacts (1 target will have no contact)')

  // Create 4 targets
  console.log('\n📝 Creating 4 test targets...\n')

  const now = new Date().toISOString()

  // Target 1: PAUL with contact
  const target1 = await createRecord('COLD_CALL_TARGETS', {
    'Company': [selectedCompanies[0].id],
    'Contact': selectedContacts[0] ? [selectedContacts[0].id] : undefined,
    'Business Line': [paulBL.id],
    'Owner': 'Lilian',
    'Call Status': 'À appeler',
    'Created At': now,
    'Updated At': now,
  })
  console.log(`✅ Target 1: ${selectedCompanies[0].fields.Name} - PAUL ${selectedContacts[0] ? '(with contact)' : '(no contact)'}`)

  // Target 2: PAUL with contact
  const target2 = await createRecord('COLD_CALL_TARGETS', {
    'Company': [selectedCompanies[1].id],
    'Contact': selectedContacts[1] ? [selectedContacts[1].id] : undefined,
    'Business Line': [paulBL.id],
    'Owner': 'Lilian',
    'Call Status': 'À appeler',
    'Created At': now,
    'Updated At': now,
  })
  console.log(`✅ Target 2: ${selectedCompanies[1].fields.Name} - PAUL ${selectedContacts[1] ? '(with contact)' : '(no contact)'}`)

  // Target 3: SACHA with contact
  const target3 = await createRecord('COLD_CALL_TARGETS', {
    'Company': [selectedCompanies[2].id],
    'Contact': selectedContacts[2] ? [selectedContacts[2].id] : undefined,
    'Business Line': [sachaBL.id],
    'Owner': 'Lilian',
    'Call Status': 'À appeler',
    'Created At': now,
    'Updated At': now,
  })
  console.log(`✅ Target 3: ${selectedCompanies[2].fields.Name} - SACHA/Leverio ${selectedContacts[2] ? '(with contact)' : '(no contact)'}`)

  // Target 4: SACHA WITHOUT contact (intentional)
  const target4 = await createRecord('COLD_CALL_TARGETS', {
    'Company': [selectedCompanies[3].id],
    // Intentionally NO Contact
    'Business Line': [sachaBL.id],
    'Owner': 'Lilian',
    'Call Status': 'À appeler',
    'Created At': now,
    'Updated At': now,
  })
  console.log(`✅ Target 4: ${selectedCompanies[3].fields.Name} - SACHA/Leverio (NO CONTACT - intentional test)`)

  console.log('\n✅ All 4 QA targets created successfully!')
  console.log('\nYou can now test the /cold-call page')
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
