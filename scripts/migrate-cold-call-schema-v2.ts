#!/usr/bin/env npx tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing credentials')
  process.exit(1)
}

const BASE_URL = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`

async function getBaseSchema(): Promise<any> {
  const response = await fetch(BASE_URL, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status}`)
  }

  return await response.json()
}

async function createTable(name: string, fields: any[]): Promise<string> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, fields }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create table: ${response.status} ${error}`)
  }

  const result = await response.json()
  return result.id
}

async function addField(tableId: string, field: any): Promise<void> {
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
    throw new Error(`Failed to add field: ${response.status} ${error}`)
  }
}

async function main() {
  console.log('🔍 Inspecting base...\n')

  const schema = await getBaseSchema()
  const tableNames = schema.tables.map((t: any) => t.name)

  console.log('Tables:', tableNames.join(', '))

  const tables = {
    companies: schema.tables.find((t: any) => t.name === 'COMPANIES'),
    contacts: schema.tables.find((t: any) => t.name === 'CONTACTS'),
    businessLines: schema.tables.find((t: any) => t.name === 'BUSINESS_LINES'),
    opportunities: schema.tables.find((t: any) => t.name === 'OPPORTUNITIES'),
    activities: schema.tables.find((t: any) => t.name === 'ACTIVITIES'),
    tasks: schema.tables.find((t: any) => t.name === 'TASKS'),
    coldCallTargets: schema.tables.find((t: any) => t.name === 'COLD_CALL_TARGETS'),
  }

  // Step 1: Create COLD_CALL_TARGETS if needed
  let coldCallTableId: string

  if (tables.coldCallTargets) {
    console.log('\n✅ COLD_CALL_TARGETS already exists')
    coldCallTableId = tables.coldCallTargets.id
  } else {
    console.log('\n📝 Creating COLD_CALL_TARGETS...')

    // Create with minimal fields first
    const basicFields = [
      {
        name: 'Name',
        type: 'singleLineText',
      },
      {
        name: 'Owner',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Eric' },
            { name: 'Lilian' },
          ],
        },
      },
      {
        name: 'Call Status',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'À appeler' },
            { name: 'À rappeler' },
            { name: 'Email Flow' },
            { name: 'Mauvais numéro' },
            { name: 'Pas intéressé' },
            { name: 'RDV booké' },
          ],
        },
      },
      {
        name: 'Created At',
        type: 'dateTime',
        options: {
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' },
          timeZone: 'utc',
        },
      },
      {
        name: 'Updated At',
        type: 'dateTime',
        options: {
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' },
          timeZone: 'utc',
        },
      },
    ]

    coldCallTableId = await createTable('COLD_CALL_TARGETS', basicFields)
    console.log('✅ Table created')

    // Now add linked fields one by one
    console.log('📝 Adding linked fields...')

    await addField(coldCallTableId, {
      name: 'Company',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: tables.companies.id,
        isReversed: false,
        prefersSingleRecordLink: false,
      },
    })
    console.log('  ✅ Company')

    await addField(coldCallTableId, {
      name: 'Contact',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: tables.contacts.id,
        isReversed: false,
        prefersSingleRecordLink: false,
      },
    })
    console.log('  ✅ Contact')

    await addField(coldCallTableId, {
      name: 'Business Line',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: tables.businessLines.id,
        isReversed: false,
        prefersSingleRecordLink: false,
      },
    })
    console.log('  ✅ Business Line')

    await addField(coldCallTableId, {
      name: 'Opportunity',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: tables.opportunities.id,
        isReversed: false,
        prefersSingleRecordLink: false,
      },
    })
    console.log('  ✅ Opportunity')
  }

  // Refresh schema
  const updatedSchema = await getBaseSchema()
  const coldCallTable = updatedSchema.tables.find((t: any) => t.name === 'COLD_CALL_TARGETS')

  if (!coldCallTable) {
    throw new Error('COLD_CALL_TARGETS not found after creation')
  }

  // Step 2: Add Cold Call Target to ACTIVITIES
  console.log('\n📝 Updating ACTIVITIES...')
  const activitiesTable = updatedSchema.tables.find((t: any) => t.name === 'ACTIVITIES')
  const hasCCT = activitiesTable.fields.some((f: any) => f.name === 'Cold Call Target')

  if (hasCCT) {
    console.log('  ✅ Field already exists')
  } else {
    await addField(activitiesTable.id, {
      name: 'Cold Call Target',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: coldCallTable.id,
      },
    })
    console.log('  ✅ Field added')
  }

  // Step 3: Add Cold Call Target to TASKS
  console.log('\n📝 Updating TASKS...')
  const tasksTable = updatedSchema.tables.find((t: any) => t.name === 'TASKS')
  const hasCCTInTasks = tasksTable.fields.some((f: any) => f.name === 'Cold Call Target')

  if (hasCCTInTasks) {
    console.log('  ✅ Field already exists')
  } else {
    await addField(tasksTable.id, {
      name: 'Cold Call Target',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: coldCallTable.id,
      },
    })
    console.log('  ✅ Field added')
  }

  console.log('\n✅ Schema migration completed!')
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
