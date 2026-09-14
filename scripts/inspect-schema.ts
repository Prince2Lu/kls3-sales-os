#!/usr/bin/env npx tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const BASE_URL = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`

async function main() {
  const response = await fetch(BASE_URL, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  const schema = await response.json()

  // Find ACTIVITIES table and inspect linked fields
  const activities = schema.tables.find((t: any) => t.name === 'ACTIVITIES')

  if (activities) {
    console.log('ACTIVITIES linked fields:')
    const linkedFields = activities.fields.filter((f: any) => f.type === 'multipleRecordLinks')
    linkedFields.forEach((f: any) => {
      console.log(`\n${f.name}:`)
      console.log(JSON.stringify(f.options, null, 2))
    })
  }
}

main()
