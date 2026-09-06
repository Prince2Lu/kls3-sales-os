#!/usr/bin/env tsx

/**
 * Apply simple priority mapping to 48 KLS3_NOTAIRES Opportunities
 * Based on NOTAIRES_SIMPLE_PRIORITY_MAPPING.md
 */

import { getOpportunities, updateOpportunity } from '@/lib/airtable/client'
import type { Priority } from '@/types/domain'

// Mapping from NOTAIRES_SIMPLE_PRIORITY_MAPPING.md
const PRIORITY_MAPPING: Record<string, Priority> = {
  // HIGH (12)
  '7': 'HIGH',   // BREMENS
  '20': 'HIGH',  // CIRMAN
  '43': 'HIGH',  // 1270 NOTAIRES
  '14': 'HIGH',  // FONTEYNE
  '31': 'HIGH',  // GRIMAUD-VAISSIERE
  '4': 'HIGH',   // DUPONT-CARIOT
  '32': 'HIGH',  // BOYER/CAYROU
  '36': 'HIGH',  // CHAMPAGNE/ROSE
  '2': 'HIGH',   // BESSE/MEUNIER/PICARD
  '22': 'HIGH',  // JACOB/SCHLEICH
  '40': 'HIGH',  // OFFICE NICE MASSENA
  '46': 'HIGH',  // PETIT-CHARTREL/BARBEY

  // MEDIUM (24)
  '3': 'MEDIUM',   // 1661 NOTAIRES
  '25': 'MEDIUM',  // OFFICE DES MOSAIQUES
  '21': 'MEDIUM',  // GRAZIOSI
  '34': 'MEDIUM',  // SCP BBH
  '44': 'MEDIUM',  // SCOUARNEC
  '50': 'MEDIUM',  // TENIERE/BANVILLE
  '1': 'MEDIUM',   // BEAUCHET
  '18': 'MEDIUM',  // BODIN
  '19': 'MEDIUM',  // CHAUVEAU
  '27': 'MEDIUM',  // DE GAIL
  '30': 'MEDIUM',  // RIEGER
  '37': 'MEDIUM',  // PERRIN
  '39': 'MEDIUM',  // BRIZIO/PELLEGRINO
  '48': 'MEDIUM',  // THOUIN-GUÉRILLON
  '5': 'MEDIUM',   // TREMOSA
  '11': 'MEDIUM',  // MONCHICOURT
  '17': 'MEDIUM',  // LES NOUVEAUX NOTAIRES
  '23': 'MEDIUM',  // ROESEN/AREND
  '24': 'MEDIUM',  // SIMON NOTAIRES
  '26': 'MEDIUM',  // SCHULLER/WALTHER
  '33': 'MEDIUM',  // ODC
  '47': 'MEDIUM',  // SAS SENEA
  '49': 'MEDIUM',  // HV NOTAIRES
  '15': 'MEDIUM',  // EFFICIENCE LILLE

  // LOW (12)
  '6': 'LOW',   // GAZQUEZ
  '8': 'LOW',   // OFFICE DE LA COLLINE
  '9': 'LOW',   // LEMBREZ
  '10': 'LOW',  // PERRAUD
  '12': 'LOW',  // ETUDE LA PROVIDENCE
  '13': 'LOW',  // LANCELIN
  '16': 'LOW',  // THOMAS
  '28': 'LOW',  // LEPERCQ
  '35': 'LOW',  // CTM NOTAIRES
  '38': 'LOW',  // ODELIA NOTAIRES
  '41': 'LOW',  // BURLOT
  '42': 'LOW',  // WM NOTARIAT
}

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log('[apply-notaires-priorities] Starting...')
  console.log(`[apply-notaires-priorities] Mode: ${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}`)

  // Fetch all KLS3_NOTAIRES opportunities
  console.log('[apply-notaires-priorities] Fetching KLS3_NOTAIRES opportunities...')
  const allOpportunities = await getOpportunities()
  const notairesOpportunities = allOpportunities.filter(
    (opp) => opp.businessLineId === 'recKjGIHpgzXdbPKP' // KLS3_NOTAIRES business line ID (actual)
  )

  console.log(`[apply-notaires-priorities] Found ${notairesOpportunities.length} KLS3_NOTAIRES opportunities`)

  // Build ID→SourceID mapping for matching
  const sourceIdToAirtableId = new Map<string, string>()
  for (const opp of notairesOpportunities) {
    // Extract source ID from name or custom field if available
    // For now, we'll match by position/order as imported
    sourceIdToAirtableId.set(opp.id, opp.id)
  }

  // Group by priority
  const stats = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    total: 0,
    matched: 0,
    unmatched: 0,
  }

  const updates: Array<{ id: string; company: string; oldPriority: Priority | null; newPriority: Priority }> = []

  // Match opportunities by name similarity
  for (const [sourceId, newPriority] of Object.entries(PRIORITY_MAPPING)) {
    // Find matching opportunity by source ID in staging
    // Since we don't have direct source ID tracking, we'll need to match by company name
    // This is fragile - better approach would be to store source ID during import

    // For now, we'll use the imported order assumption
    // This requires mapping CSV line numbers to Airtable IDs
    // SAFER: Match by company name from the mapping document

    stats.total++
  }

  console.log(`\n[apply-notaires-priorities] Expected updates: ${Object.keys(PRIORITY_MAPPING).length}`)
  console.log(`[apply-notaires-priorities] Found opportunities: ${notairesOpportunities.length}`)

  // IMPORTANT: Without source ID tracking, we need company name matching
  // Let's build the mapping from NOTAIRES_SIMPLE_PRIORITY_MAPPING.md

  const COMPANY_NAME_MAPPING: Record<string, Priority> = {
    'SELAS BREMENS NOTAIRES': 'HIGH',
    'CIRMAN et associés': 'HIGH',
    '1270 NOTAIRES, SAS': 'HIGH',
    'FONTEYNE et associés': 'HIGH',
    'SARL OFFICE NOTARIAL DU GRAND ROND-GRIMAUD-VAISSIERE': 'HIGH',
    'DUPONT-CARIOT ET ASSOCIES, SAS': 'HIGH',
    'BOYER, CAYROU LAURE, CASTER, D\'AMELIO, MORETTI, notaires associés, SCP': 'HIGH',
    'SCP Jean-Noël CHAMPAGNE, Laurent ROSE': 'HIGH',
    'SCP Jean-Christophe BESSE, Cécile MEUNIER et Séverine PICARD': 'HIGH',
    'SCP Michaël JACOB et Laura SCHLEICH, notaires associés': 'HIGH',
    'OFFICE NOTARIAL NICE PLACE MASSENA, SCP': 'HIGH',
    'SELARL Pascale PETIT-CHARTREL, Benoît BARBEY et Pierre METAY, notaires associés': 'HIGH',

    'SCP Olivier CLERMONT, Julien GUEZ et Camille BEAUDOIN - 1661 Notaires': 'MEDIUM',
    'OFFICE DES MOSAIQUES, SAS': 'MEDIUM',
    'GRAZIOSI et associé': 'MEDIUM',
    'SCP BBH Notaires, Michel BURGAN, Laure BENGUIGUI, Cécile BLACHON': 'MEDIUM',
    'SCOUARNEC et associé': 'MEDIUM',
    'SELARL TENIERE, BANVILLE, BARRY et LEROY-DUDONNE': 'MEDIUM',
    'SELARL BEAUCHET, NOTAIRE ASSOCIE': 'MEDIUM',
    'BODIN et associé': 'MEDIUM',
    'CHAUVEAU, notaire associé': 'MEDIUM',
    'DE GAIL Philippe': 'MEDIUM',
    'RIEGER et associé': 'MEDIUM',
    'PERRIN et associées': 'MEDIUM',
    'SELAS BRIZIO, PELLEGRINO-GARCIN, FRICK, NOTAIRES': 'MEDIUM',
    'THOUIN-GUÉRILLON, SELAS': 'MEDIUM',
    'SELARL TREMOSA - LESCHELLE - POUZENC & Associés': 'MEDIUM',
    'MONCHICOURT et associé': 'MEDIUM',
    'SAS LES NOUVEAUX NOTAIRES': 'MEDIUM',
    'SCP Thibaut ROESEN et Clémentine AREND, notaires associés': 'MEDIUM',
    'SCP SIMON NOTAIRES': 'MEDIUM',
    'SCP Laurence SCHULLER et Elodie WALTHER, notaires associées': 'MEDIUM',
    'ODC Notaires associés, SELARL': 'MEDIUM',
    'SAS SENEA': 'MEDIUM',
    'HV NOTAIRES, SELARL': 'MEDIUM',
    'EFFICIENCE LILLE, SAS': 'MEDIUM',

    'GAZQUEZ, SELARL': 'LOW',
    'SELARL OFFICE DE LA COLLINE': 'LOW',
    'SELARL LEMBREZ et Associés, Notaires': 'LOW',
    'PERRAUD & Associés - Notaires, SAS': 'LOW',
    'SELARL ETUDE LA PROVIDENCE': 'LOW',
    'LANCELIN, notaire associée, SELARL': 'LOW',
    'THOMAS et associés': 'LOW',
    'LEPERCQ Cordelia': 'LOW',
    'CTM NOTAIRES, SELAS': 'LOW',
    'ODELIA NOTAIRES, SELAS': 'LOW',
    'BURLOT Carine': 'LOW',
    'WM NOTARIAT, SELAS': 'LOW',
  }

  // Match and update
  const finalUpdates: typeof updates = []

  for (const opp of notairesOpportunities) {
    const newPriority = COMPANY_NAME_MAPPING[opp.name]

    if (!newPriority) {
      console.warn(`[apply-notaires-priorities] ⚠️  No mapping found for: ${opp.name}`)
      stats.unmatched++
      continue
    }

    stats.matched++
    if (newPriority === 'HIGH' || newPriority === 'MEDIUM' || newPriority === 'LOW') {
      stats[newPriority]++
    }

    finalUpdates.push({
      id: opp.id,
      company: opp.name,
      oldPriority: opp.priority || null,
      newPriority,
    })
  }

  console.log(`\n=== DRY-RUN RESULTS ===\n`)
  console.log(`Matched: ${stats.matched}`)
  console.log(`Unmatched: ${stats.unmatched}`)
  console.log(`HIGH: ${stats.HIGH}`)
  console.log(`MEDIUM: ${stats.MEDIUM}`)
  console.log(`LOW: ${stats.LOW}`)

  if (stats.HIGH !== 12 || stats.MEDIUM !== 24 || stats.LOW !== 12) {
    console.error(`\n❌ ERROR: Distribution mismatch!`)
    console.error(`Expected: HIGH=12 MEDIUM=24 LOW=12`)
    console.error(`Got: HIGH=${stats.HIGH} MEDIUM=${stats.MEDIUM} LOW=${stats.LOW}`)
    process.exit(1)
  }

  if (stats.matched !== 48) {
    console.error(`\n❌ ERROR: Expected 48 matches, got ${stats.matched}`)
    process.exit(1)
  }

  console.log(`\n✅ Distribution correct: 12/24/12`)

  // Show sample updates
  console.log(`\n=== SAMPLE UPDATES (first 5 each) ===\n`)

  const highSample = finalUpdates.filter(u => u.newPriority === 'HIGH').slice(0, 5)
  const mediumSample = finalUpdates.filter(u => u.newPriority === 'MEDIUM').slice(0, 5)
  const lowSample = finalUpdates.filter(u => u.newPriority === 'LOW').slice(0, 5)

  console.log(`HIGH (${stats.HIGH}):`)
  highSample.forEach(u => console.log(`  - ${u.company}`))

  console.log(`\nMEDIUM (${stats.MEDIUM}):`)
  mediumSample.forEach(u => console.log(`  - ${u.company}`))

  console.log(`\nLOW (${stats.LOW}):`)
  lowSample.forEach(u => console.log(`  - ${u.company}`))

  if (DRY_RUN) {
    console.log(`\n✅ DRY-RUN COMPLETE — No changes made`)
    console.log(`\nRun without --dry-run to apply changes`)
    return
  }

  // Execute updates
  console.log(`\n=== EXECUTING UPDATES ===\n`)

  let updated = 0
  for (const update of finalUpdates) {
    try {
      await updateOpportunity(update.id, {
        priority: update.newPriority,
      })
      updated++
      if (updated % 10 === 0) {
        console.log(`Updated ${updated}/${finalUpdates.length}...`)
      }
    } catch (error) {
      console.error(`Failed to update ${update.company}:`, error)
    }
  }

  console.log(`\n✅ COMPLETE`)
  console.log(`Updated: ${updated}`)
  console.log(`HIGH: ${stats.HIGH}`)
  console.log(`MEDIUM: ${stats.MEDIUM}`)
  console.log(`LOW: ${stats.LOW}`)
}

main().catch((error) => {
  console.error('[apply-notaires-priorities] Fatal error:', error)
  process.exit(1)
})
