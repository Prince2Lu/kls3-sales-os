// READ-ONLY diagnostic (Trello #51): Opportunities sitting before the RDV stage.
// Writes nothing to Airtable and no file. Prints only Airtable ids and counters:
// no company, contact, email or phone.
// Usage: npm run diagnose:early-opps   (needs .env.local)

import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

const envResult = loadEnv({ path: resolve(process.cwd(), '.env.local') })
if (envResult.error) {
  console.error('Impossible de charger .env.local')
  process.exit(1)
}

import {
  getActivities,
  getBusinessLines,
  getColdCallTargets,
  getOpportunities,
  getTasks,
  getValueEvents,
} from '@/lib/airtable'
import { classifyEarlyOpportunities, summarizeEarlyOpportunities } from '@/lib/prospecting/early-opportunities'

async function main() {
  const [opportunities, activities, tasks, valueEvents, targets, businessLines] = await Promise.all([
    getOpportunities(),
    getActivities(),
    getTasks(),
    getValueEvents(),
    getColdCallTargets(),
    getBusinessLines(),
  ])
  const codeById = new Map(businessLines.map((bl) => [bl.id, bl.code]))
  const rows = classifyEarlyOpportunities({ opportunities, activities, tasks, valueEvents, targets }).map((row) => ({
    ...row,
    businessLineId: codeById.get(row.businessLineId) ?? row.businessLineId,
  }))
  const summary = summarizeEarlyOpportunities(rows)

  console.log('OPPORTUNITÉS AVANT L\'ÉTAPE RDV (lecture seule)')
  console.log(`Opportunités au total : ${opportunities.length}`)
  console.log(`Avant RDV : ${summary.total}`)
  console.log('Groupes : A = RDV pris ou prévu (à passer en RDV), B = conversations seulement (retour prospection), C = signal économique (à revoir une par une)')
  console.log('Par groupe :', summary.byGroup)
  console.log('Par étape :', summary.byStage)
  console.log('Par business line :', summary.byBusinessLine)
  console.log('Par mois de création :', summary.byCreationMonth)
  console.log('\nDétail (id Airtable uniquement) :')
  console.table(
    rows.map((r) => ({
      id: r.id,
      groupe: r.group,
      etape: r.stage,
      bl: r.businessLineId,
      owner: r.owner,
      cree: r.createdAt?.slice(0, 10),
      activites: Object.entries(r.activityResults).map(([k, v]) => `${k}:${v}`).join(' '),
      tacheTodo: r.hasTodoTask,
      valueEvent: r.hasValueEvent,
      montant: r.hasPotentialValue,
      cibles: r.linkedTargetStatuses.join(', '),
    }))
  )
}

main().catch((error) => {
  console.error('Diagnostic interrompu :', error instanceof Error ? error.message : 'erreur inconnue')
  process.exit(1)
})
