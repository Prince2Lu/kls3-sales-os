import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

const envResult = loadEnv({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.error('Failed to load .env.local:', envResult.error)
  process.exit(1)
}

import {
  getOpportunities,
  getCompanies,
  getContacts,
  getTasks,
  getActivities,
  getStageHistory,
} from '@/lib/airtable'

function hasDemoMarker(...values: Array<string | undefined | null>): boolean {
  return values.some((value) => typeof value === 'string' && value.includes('[DEMO]'))
}

async function verify() {
  console.log('🔍 Verifying exact demo data counts...\n')

  const [opportunities, companies, contacts, tasks, activities, stageHistory] =
    await Promise.all([
      getOpportunities({ maxRecords: 500 }),
      getCompanies({ maxRecords: 500 }),
      getContacts({ maxRecords: 500 }),
      getTasks({ maxRecords: 500 }),
      getActivities({ maxRecords: 500 }),
      getStageHistory({ maxRecords: 500 }),
    ])

  const demoOpportunities = opportunities.filter((o) => hasDemoMarker(o.name))
  const demoCompanies = companies.filter((c) => hasDemoMarker(c.name))
  const demoContacts = contacts.filter((c) => hasDemoMarker(c.firstName, c.lastName))
  const demoTasks = tasks.filter((t) => hasDemoMarker(t.notes))
  const demoActivities = activities.filter((a) => hasDemoMarker(a.notes))

  const demoOpportunityIds = new Set(demoOpportunities.map((o) => o.id))
  const demoStageHistory = stageHistory.filter(
    (s) => s.opportunityId && demoOpportunityIds.has(s.opportunityId)
  )

  const lilianOpps = demoOpportunities.filter((o) => o.owner === 'Lilian')
  const ericOpps = demoOpportunities.filter((o) => o.owner === 'Eric')

  console.log('EXACT COUNTS CREATED:')
  console.log(`  Opportunities: ${demoOpportunities.length}`)
  console.log(`  Companies: ${demoCompanies.length}`)
  console.log(`  Contacts: ${demoContacts.length}`)
  console.log(`  Tasks: ${demoTasks.length}`)
  console.log(`  Activities: ${demoActivities.length}`)
  console.log(`  Stage History: ${demoStageHistory.length}`)
  console.log()
  console.log('OWNER DISTRIBUTION:')
  console.log(
    `  Lilian: ${lilianOpps.length} (${Math.round((lilianOpps.length / demoOpportunities.length) * 100)}%)`
  )
  console.log(
    `  Eric: ${ericOpps.length} (${Math.round((ericOpps.length / demoOpportunities.length) * 100)}%)`
  )
  console.log()

  const paulOpps = demoOpportunities.filter(
    (o) =>
      o.name.includes('PAUL') ||
      [
        'Cabinet Médical Saint-Michel',
        'Clinique de la Gare',
        'Centre Dentaire Voltaire',
        'Polyclinique du Parc',
        'Cabinet Kiné Alliance',
      ].some((n) => o.name.includes(n))
  )
  const sachaOpps = demoOpportunities.filter((o) =>
    [
      'Martin Conseil',
      'Dupont & Associés',
      'Beaumont Expertise',
      'Conseil Plus',
      'Fischer Consulting',
    ].some((n) => o.name.includes(n))
  )
  const calymiaOpps = demoOpportunities.filter(
    (o) => o.name.includes('Sophro') || o.name.includes('Bien-Être')
  )
  const notairesOpps = demoOpportunities.filter(
    (o) =>
      o.name.includes('Notarial') ||
      o.name.includes('Notaire') ||
      o.name.includes('SCP') ||
      o.name.includes('Office')
  )

  console.log('BUSINESS LINE DISTRIBUTION:')
  console.log(`  PAUL (health): ${paulOpps.length}`)
  console.log(`  SACHA (consultants): ${sachaOpps.length}`)
  console.log(`  CALYMIA (sophrologists): ${calymiaOpps.length}`)
  console.log(`  KLS3_NOTAIRES (notaries): ${notairesOpps.length}`)
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
