#!/usr/bin/env npx tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const BASE_URL = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`

async function main() {
  const response = await fetch(BASE_URL, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` },
  })

  const schema = await response.json()
  const cct = schema.tables.find((t: any) => t.name === 'COLD_CALL_TARGETS')

  if (!cct) {
    console.error('❌ COLD_CALL_TARGETS not found')
    process.exit(1)
  }

  console.log('COLD_CALL_TARGETS fields:\n')
  cct.fields.forEach((f: any) => {
    console.log(`- ${f.name} (${f.type})`)
    if (f.options) {
      console.log(`  Options: ${JSON.stringify(f.options, null, 2)}`)
    }
  })
}

main()
