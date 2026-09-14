#!/usr/bin/env npx tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const BASE_URL = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`

async function getSchema() {
  const response = await fetch(BASE_URL, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` },
  })
  return await response.json()
}

async function addField(tableId: string, field: any) {
  const response = await fetch(`${BASE_URL}/${tableId}/fields`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(field),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed: ${error}`)
  }

  return await response.json()
}

async function main() {
  console.log('🔍 Fetching schema...\n')

  const schema = await getSchema()

  const tables = {
    cct: schema.tables.find((t: any) => t.name === 'COLD_CALL_TARGETS'),
    companies: schema.tables.find((t: any) => t.name === 'COMPANIES'),
    contacts: schema.tables.find((t: any) => t.name === 'CONTACTS'),
    businessLines: schema.tables.find((t: any) => t.name === 'BUSINESS_LINES'),
    opportunities: schema.tables.find((t: any) => t.name === 'OPPORTUNITIES'),
  }

  const existingFields = tables.cct.fields.map((f: any) => f.name)

  console.log('Existing fields:', existingFields.join(', '))
  console.log('\n📝 Adding missing linked fields...\n')

  const fieldsToAdd = [
    { name: 'Company', targetId: tables.companies.id },
    { name: 'Contact', targetId: tables.contacts.id },
    { name: 'Business Line', targetId: tables.businessLines.id },
    { name: 'Opportunity', targetId: tables.opportunities.id },
  ]

  for (const field of fieldsToAdd) {
    if (existingFields.includes(field.name)) {
      console.log(`✅ ${field.name} already exists`)
      continue
    }

    try {
      await addField(tables.cct.id, {
        name: field.name,
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: field.targetId,
        },
      })
      console.log(`✅ Added ${field.name}`)
    } catch (error: any) {
      console.error(`❌ Failed to add ${field.name}:`, error.message)
    }
  }

  console.log('\n✅ Done!')
}

main()
