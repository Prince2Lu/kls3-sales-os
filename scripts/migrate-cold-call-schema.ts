#!/usr/bin/env npx tsx

/**
 * Migration script: Add COLD_CALL_TARGETS table and update ACTIVITIES/TASKS
 *
 * This script:
 * 1. Inspects current Airtable base schema
 * 2. Creates COLD_CALL_TARGETS table if needed
 * 3. Adds Cold Call Target field to ACTIVITIES and TASKS
 * 4. Does NOT modify or delete any existing data or fields
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID in .env.local')
  process.exit(1)
}

const BASE_URL = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`

interface AirtableField {
  id: string
  name: string
  type: string
  options?: any
}

interface AirtableTable {
  id: string
  name: string
  fields: AirtableField[]
}

interface BaseSchema {
  tables: AirtableTable[]
}

// Fetch base schema
async function getBaseSchema(): Promise<BaseSchema> {
  const response = await fetch(BASE_URL, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch base schema: ${response.status} ${error}`)
  }

  return await response.json()
}

// Create a new table
async function createTable(name: string, fields: any[]): Promise<string> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      fields,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create table ${name}: ${response.status} ${error}`)
  }

  const result = await response.json()
  return result.id
}

// Add a field to an existing table
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
  console.log('🔍 Inspecting Airtable base schema...\n')

  const schema = await getBaseSchema()

  // Verify this is the correct base
  const tableNames = schema.tables.map(t => t.name)
  console.log('📋 Tables found:', tableNames.join(', '))

  const expectedTables = [
    'BUSINESS_LINES',
    'COMPANIES',
    'CONTACTS',
    'OPPORTUNITIES',
    'ACTIVITIES',
    'TASKS',
    'VALUE_EVENTS',
    'GOALS',
    'STAGE_HISTORY',
  ]

  const missingTables = expectedTables.filter(t => !tableNames.includes(t))
  if (missingTables.length > 0) {
    console.error(`❌ Missing expected tables: ${missingTables.join(', ')}`)
    console.error('This does not appear to be the KLS3 Sales OS base.')
    process.exit(1)
  }

  console.log('✅ Base verified as KLS3 Sales OS\n')

  // Get table IDs
  const tables = {
    companies: schema.tables.find(t => t.name === 'COMPANIES'),
    contacts: schema.tables.find(t => t.name === 'CONTACTS'),
    businessLines: schema.tables.find(t => t.name === 'BUSINESS_LINES'),
    opportunities: schema.tables.find(t => t.name === 'OPPORTUNITIES'),
    activities: schema.tables.find(t => t.name === 'ACTIVITIES'),
    tasks: schema.tables.find(t => t.name === 'TASKS'),
    coldCallTargets: schema.tables.find(t => t.name === 'COLD_CALL_TARGETS'),
  }

  // Step 1: Create COLD_CALL_TARGETS if needed
  let coldCallTargetsId: string

  if (tables.coldCallTargets) {
    console.log('✅ COLD_CALL_TARGETS table already exists')
    coldCallTargetsId = tables.coldCallTargets.id

    // Check existing fields
    const existingFields = tables.coldCallTargets.fields.map(f => f.name)
    console.log('   Existing fields:', existingFields.join(', '))

    // Add missing fields
    const requiredFields = [
      'Company',
      'Contact',
      'Business Line',
      'Owner',
      'Call Status',
      'Opportunity',
      'Created At',
      'Updated At',
    ]

    const missingFields = requiredFields.filter(f => !existingFields.includes(f))

    if (missingFields.length > 0) {
      console.log(`⚠️  Missing fields in COLD_CALL_TARGETS: ${missingFields.join(', ')}`)
      console.log('   Adding missing fields...')

      for (const fieldName of missingFields) {
        let fieldConfig: any

        switch (fieldName) {
          case 'Company':
            fieldConfig = {
              name: 'Company',
              type: 'multipleRecordLinks',
              options: {
                linkedTableId: tables.companies!.id,
                isReversed: false,
              },
            }
            break
          case 'Contact':
            fieldConfig = {
              name: 'Contact',
              type: 'multipleRecordLinks',
              options: {
                linkedTableId: tables.contacts!.id,
                isReversed: false,
              },
            }
            break
          case 'Business Line':
            fieldConfig = {
              name: 'Business Line',
              type: 'multipleRecordLinks',
              options: {
                linkedTableId: tables.businessLines!.id,
                isReversed: false,
              },
            }
            break
          case 'Owner':
            fieldConfig = {
              name: 'Owner',
              type: 'singleSelect',
              options: {
                choices: [
                  { name: 'Eric' },
                  { name: 'Lilian' },
                ],
              },
            }
            break
          case 'Call Status':
            fieldConfig = {
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
            }
            break
          case 'Opportunity':
            fieldConfig = {
              name: 'Opportunity',
              type: 'multipleRecordLinks',
              options: {
                linkedTableId: tables.opportunities!.id,
                isReversed: false,
              },
            }
            break
          case 'Created At':
            fieldConfig = {
              name: 'Created At',
              type: 'dateTime',
              options: {
                dateFormat: {
                  name: 'iso',
                },
                timeFormat: {
                  name: '24hour',
                },
                timeZone: 'utc',
              },
            }
            break
          case 'Updated At':
            fieldConfig = {
              name: 'Updated At',
              type: 'dateTime',
              options: {
                dateFormat: {
                  name: 'iso',
                },
                timeFormat: {
                  name: '24hour',
                },
                timeZone: 'utc',
              },
            }
            break
        }

        if (fieldConfig) {
          await addField(coldCallTargetsId, fieldConfig)
          console.log(`   ✅ Added field: ${fieldName}`)
        }
      }
    } else {
      console.log('   ✅ All required fields present')
    }
  } else {
    console.log('📝 Creating COLD_CALL_TARGETS table...')

    const fields = [
      {
        name: 'Name',
        type: 'singleLineText',
      },
      {
        name: 'Company',
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: tables.companies!.id,
          isReversed: false,
        },
      },
      {
        name: 'Contact',
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: tables.contacts!.id,
          isReversed: false,
        },
      },
      {
        name: 'Business Line',
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: tables.businessLines!.id,
          isReversed: false,
        },
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
        name: 'Opportunity',
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: tables.opportunities!.id,
          isReversed: false,
        },
      },
      {
        name: 'Created At',
        type: 'dateTime',
        options: {
          dateFormat: {
            name: 'iso',
          },
          timeFormat: {
            name: '24hour',
          },
          timeZone: 'utc',
        },
      },
      {
        name: 'Updated At',
        type: 'dateTime',
        options: {
          dateFormat: {
            name: 'iso',
          },
          timeFormat: {
            name: '24hour',
          },
          timeZone: 'utc',
        },
      },
    ]

    coldCallTargetsId = await createTable('COLD_CALL_TARGETS', fields)
    console.log('✅ COLD_CALL_TARGETS table created\n')
  }

  // Refresh schema to get COLD_CALL_TARGETS ID
  const updatedSchema = await getBaseSchema()
  const coldCallTable = updatedSchema.tables.find(t => t.name === 'COLD_CALL_TARGETS')

  if (!coldCallTable) {
    throw new Error('COLD_CALL_TARGETS table not found after creation')
  }

  // Step 2: Add Cold Call Target to ACTIVITIES
  console.log('\n📝 Updating ACTIVITIES table...')
  const activitiesTable = updatedSchema.tables.find(t => t.name === 'ACTIVITIES')!
  const hasColdCallTargetInActivities = activitiesTable.fields.some(f => f.name === 'Cold Call Target')

  if (hasColdCallTargetInActivities) {
    console.log('   ✅ Cold Call Target field already exists in ACTIVITIES')
  } else {
    await addField(activitiesTable.id, {
      name: 'Cold Call Target',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: coldCallTable.id,
        isReversed: false,
      },
    })
    console.log('   ✅ Added Cold Call Target field to ACTIVITIES')
  }

  // Step 3: Add Cold Call Target to TASKS
  console.log('\n📝 Updating TASKS table...')
  const tasksTable = updatedSchema.tables.find(t => t.name === 'TASKS')!
  const hasColdCallTargetInTasks = tasksTable.fields.some(f => f.name === 'Cold Call Target')

  if (hasColdCallTargetInTasks) {
    console.log('   ✅ Cold Call Target field already exists in TASKS')
  } else {
    await addField(tasksTable.id, {
      name: 'Cold Call Target',
      type: 'multipleRecordLinks',
      options: {
        linkedTableId: coldCallTable.id,
        isReversed: false,
      },
    })
    console.log('   ✅ Added Cold Call Target field to TASKS')
  }

  // Step 4: Verify BUSINESS_LINES
  console.log('\n🔍 Verifying BUSINESS_LINES...')
  const blResponse = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/BUSINESS_LINES`,
    {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      },
    }
  )

  if (blResponse.ok) {
    const blData = await blResponse.json()
    const businessLines = blData.records.map((r: any) => ({
      id: r.id,
      name: r.fields.Name,
      code: r.fields.Code,
    }))

    console.log('   Business Lines found:')
    businessLines.forEach((bl: any) => {
      console.log(`   - ${bl.name} (${bl.code})`)
    })

    const hasPaul = businessLines.some((bl: any) => bl.code === 'PAUL')
    const hasSacha = businessLines.some((bl: any) => bl.code === 'SACHA')

    if (!hasPaul || !hasSacha) {
      console.log('   ⚠️  Missing PAUL or SACHA business lines')
    } else {
      console.log('   ✅ PAUL and SACHA business lines present')
    }
  }

  console.log('\n✅ Schema migration completed successfully!')
  console.log('\n📊 Final schema verification:')
  console.log('   ✅ COLD_CALL_TARGETS table exists')
  console.log('   ✅ ACTIVITIES has Cold Call Target field')
  console.log('   ✅ TASKS has Cold Call Target field')
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error.message)
  process.exit(1)
})
