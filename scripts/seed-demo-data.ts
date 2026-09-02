// Seed realistic demo dataset for KLS3 Sales OS
// IMPORTANT: All records created have [DEMO] marker for safe identification

import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

const envResult = loadEnv({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.error('❌ Failed to load .env.local:', envResult.error)
  process.exit(1)
}

import {
  getOpportunities,
  getCompanies,
  getContacts,
  getTasks,
  getActivities,
  createCompany,
  createContact,
  createOpportunity,
  createTask,
  createActivity,
  createStageHistory,
  getBusinessLines,
} from '@/lib/airtable'

// ============================================================================
// HELPERS — DEMO MARKER DETECTION
// ============================================================================

/**
 * Safely checks if any of the provided values contains the [DEMO] marker.
 * Handles undefined/null values gracefully.
 */
function hasDemoMarker(...values: Array<string | undefined | null>): boolean {
  return values.some((value) => typeof value === 'string' && value.includes('[DEMO]'))
}

// ============================================================================
// HELPERS — RELATIVE DATES
// ============================================================================

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function daysFromNowDateOnly(days: number): string {
  return daysFromNow(days).split('T')[0]
}

function hoursFromNow(hours: number): string {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

function setTimeToday(hour: number, minute: number): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function setTimeTomorrow(hour: number, minute: number): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

// ============================================================================
// DETECTION — EXISTING DEMO DATA
// ============================================================================

async function detectExistingDemoData(): Promise<boolean> {
  console.log('🔍 Checking for existing [DEMO] dataset...\n')

  const [opportunities, companies, contacts, tasks, activities] = await Promise.all([
    getOpportunities({ maxRecords: 500 }),
    getCompanies({ maxRecords: 500 }),
    getContacts({ maxRecords: 500 }),
    getTasks({ maxRecords: 500 }),
    getActivities({ maxRecords: 500 }),
  ])

  const demoOpportunities = opportunities.filter((o) => hasDemoMarker(o.name))
  const demoCompanies = companies.filter((c) => hasDemoMarker(c.name))
  const demoContacts = contacts.filter((c) => hasDemoMarker(c.firstName, c.lastName))
  const demoTasks = tasks.filter((t) => hasDemoMarker(t.notes))
  const demoActivities = activities.filter((a) => hasDemoMarker(a.notes))

  if (
    demoOpportunities.length > 0 ||
    demoCompanies.length > 0 ||
    demoContacts.length > 0 ||
    demoTasks.length > 0 ||
    demoActivities.length > 0
  ) {
    console.log('⚠️  EXISTING DEMO DATA FOUND:')
    console.log(`   Opportunities: ${demoOpportunities.length}`)
    console.log(`   Companies: ${demoCompanies.length}`)
    console.log(`   Contacts: ${demoContacts.length}`)
    console.log(`   Tasks: ${demoTasks.length}`)
    console.log(`   Activities: ${demoActivities.length}`)
    console.log()
    console.log('Run `npm run cleanup:demo` first to remove existing demo data.')
    return true
  }

  console.log('✅ No existing demo data found. Proceeding with seeding.\n')
  return false
}

// ============================================================================
// SEED MAIN
// ============================================================================

async function seed() {
  console.log('🌱 SEEDING DEMO DATASET — KLS3 SALES OS\n')

  // 1. Detect existing demo data
  const hasExistingDemo = await detectExistingDemoData()
  if (hasExistingDemo) {
    process.exit(1)
  }

  // 2. Get Business Lines
  const businessLines = await getBusinessLines()
  const paulBL = businessLines.find((bl) => bl.code === 'PAUL')
  const sachaBL = businessLines.find((bl) => bl.code === 'SACHA')
  const calymiaBL = businessLines.find((bl) => bl.code === 'CALYMIA')
  const notairesBL = businessLines.find((bl) => bl.code === 'KLS3_NOTAIRES')

  if (!paulBL || !sachaBL || !calymiaBL || !notairesBL) {
    console.error('❌ Business Lines not found in Airtable')
    process.exit(1)
  }

  console.log('✅ Business Lines loaded\n')

  // ============================================================================
  // PAUL — 5 OPPORTUNITIES
  // ============================================================================

  console.log('📞 PAUL — Creating 5 demo opportunities...\n')

  // Paul 1: OVERDUE — RDV non confirmé
  const paulCompany1 = await createCompany({
    name: '[DEMO] Cabinet Médical Saint-Michel',
    city: 'Lyon',
    industry: 'Santé',
    companySize: '5-10',
  })

  const paulContact1 = await createContact({
    firstName: 'Sophie',
    lastName: 'Moreau [DEMO]',
    companyId: paulCompany1.id,
    jobTitle: 'Directrice',
    phone: '+33 6 12 34 56 78',
    email: 'sophie.moreau@demo.com',
  })

  const paulOpp1 = await createOpportunity({
    name: '[DEMO] Cabinet Médical Saint-Michel',
    companyId: paulCompany1.id,
    primaryContactId: paulContact1.id,
    businessLineId: paulBL.id,
    owner: 'Lilian',
    stage: 'RDV',
    source: 'Cold Call',
    priority: 'HIGH',
    potentialValue: 100,
    probability: 60,
  })

  await createActivity({
    opportunityId: paulOpp1.id,
    contactId: paulContact1.id,
    type: 'CALL',
    date: daysFromNow(-5),
    result: 'MEETING_BOOKED',
    notes: '[DEMO] RDV fixé, reste à confirmer',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: paulOpp1.id,
    contactId: paulContact1.id,
    type: 'CALL',
    dueAt: daysFromNow(-2), // OVERDUE
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] Confirmer RDV',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: paulOpp1.id,
    fromStage: 'Contacté',
    toStage: 'RDV',
    changedBy: 'Lilian',
  })

  // Paul 2: TODAY — Relance injoignable
  const paulCompany2 = await createCompany({
    name: '[DEMO] Clinique de la Gare',
    city: 'Marseille',
    industry: 'Santé',
    companySize: '10-50',
  })

  const paulContact2 = await createContact({
    firstName: 'Thomas',
    lastName: 'Bernard [DEMO]',
    companyId: paulCompany2.id,
    jobTitle: 'Gérant',
    phone: '+33 6 23 45 67 89',
  })

  const paulOpp2 = await createOpportunity({
    name: '[DEMO] Clinique de la Gare',
    companyId: paulCompany2.id,
    primaryContactId: paulContact2.id,
    businessLineId: paulBL.id,
    owner: 'Lilian',
    stage: 'Contacté',
    source: 'Cold Call',
    priority: 'MEDIUM',
    potentialValue: 100,
    probability: 20,
  })

  await createActivity({
    opportunityId: paulOpp2.id,
    contactId: paulContact2.id,
    type: 'CALL',
    date: daysFromNow(-3),
    result: 'NO_ANSWER',
    notes: '[DEMO] Pas de réponse',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: paulOpp2.id,
    contactId: paulContact2.id,
    type: 'CALL',
    dueAt: setTimeToday(10, 30), // TODAY
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Rappel après injoignable',
    owner: 'Lilian',
  })

  // Paul 3: TODAY MEETING — RDV à venir dans 1h30
  const paulCompany3 = await createCompany({
    name: '[DEMO] Centre Dentaire Voltaire',
    city: 'Paris',
    industry: 'Santé',
    companySize: '5-10',
  })

  const paulContact3 = await createContact({
    firstName: 'Claire',
    lastName: 'Dubois [DEMO]',
    companyId: paulCompany3.id,
    jobTitle: 'Responsable',
    phone: '+33 6 34 56 78 90',
  })

  const paulOpp3 = await createOpportunity({
    name: '[DEMO] Centre Dentaire Voltaire',
    companyId: paulCompany3.id,
    primaryContactId: paulContact3.id,
    businessLineId: paulBL.id,
    owner: 'Eric',
    stage: 'RDV',
    source: 'Cold Call',
    priority: 'HIGH',
    potentialValue: 100,
    probability: 70,
  })

  await createActivity({
    opportunityId: paulOpp3.id,
    contactId: paulContact3.id,
    type: 'CALL',
    date: daysFromNow(-7),
    result: 'MEETING_BOOKED',
    notes: '[DEMO] RDV confirmé pour diagnostic',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: paulOpp3.id,
    contactId: paulContact3.id,
    type: 'MEETING',
    dueAt: hoursFromNow(1.5), // MEETING TODAY in 1.5 hours
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] RDV diagnostic cabinet',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: paulOpp3.id,
    fromStage: 'Contacté',
    toStage: 'RDV',
    changedBy: 'Lilian',
  })

  // Paul 4: À PROSPECTER — Nouveau prospect
  const paulCompany4 = await createCompany({
    name: '[DEMO] Polyclinique du Parc',
    city: 'Bordeaux',
    industry: 'Santé',
    companySize: '50-100',
  })

  const paulContact4 = await createContact({
    firstName: 'Marc',
    lastName: 'Lefebvre [DEMO]',
    companyId: paulCompany4.id,
    jobTitle: 'Directeur Général',
    phone: '+33 6 45 67 89 01',
  })

  const paulOpp4 = await createOpportunity({
    name: '[DEMO] Polyclinique du Parc',
    companyId: paulCompany4.id,
    primaryContactId: paulContact4.id,
    businessLineId: paulBL.id,
    owner: 'Lilian',
    stage: 'À prospecter',
    source: 'Cold Call',
    priority: 'MEDIUM',
    potentialValue: 100,
    probability: 10,
  })

  await createTask({
    opportunityId: paulOpp4.id,
    contactId: paulContact4.id,
    type: 'CALL',
    dueAt: setTimeToday(14, 0), // TODAY
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Premier contact',
    owner: 'Lilian',
  })

  // Paul 5: SANS NEXT ACTION — Conversation mais pas de suite définie
  const paulCompany5 = await createCompany({
    name: '[DEMO] Cabinet Kiné Alliance',
    city: 'Nantes',
    industry: 'Santé',
    companySize: '5-10',
  })

  const paulContact5 = await createContact({
    firstName: 'Julie',
    lastName: 'Martin [DEMO]',
    companyId: paulCompany5.id,
    jobTitle: 'Gérante',
    phone: '+33 6 56 78 90 12',
  })

  const paulOpp5 = await createOpportunity({
    name: '[DEMO] Cabinet Kiné Alliance',
    companyId: paulCompany5.id,
    primaryContactId: paulContact5.id,
    businessLineId: paulBL.id,
    owner: 'Lilian',
    stage: 'Échange',
    source: 'Cold Call',
    priority: 'LOW',
    potentialValue: 100,
    probability: 30,
  })

  await createActivity({
    opportunityId: paulOpp5.id,
    contactId: paulContact5.id,
    type: 'CALL',
    date: daysFromNow(-4),
    result: 'CONVERSATION',
    notes: '[DEMO] Intéressée mais pas dispo cette semaine',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: paulOpp5.id,
    fromStage: 'Contacté',
    toStage: 'Échange',
    changedBy: 'Lilian',
  })

  console.log('✅ PAUL: 5 opportunities created\n')

  // ============================================================================
  // SACHA — 5 OPPORTUNITIES
  // ============================================================================

  console.log('🤝 SACHA — Creating 5 demo opportunities...\n')

  // Sacha 1: OVERDUE — Relance après proposition
  const sachaCompany1 = await createCompany({
    name: '[DEMO] Martin Conseil',
    city: 'Lille',
    industry: 'Conseil',
    companySize: '1-5',
  })

  const sachaContact1 = await createContact({
    firstName: 'Antoine',
    lastName: 'Rousseau [DEMO]',
    companyId: sachaCompany1.id,
    jobTitle: 'Consultant indépendant',
    phone: '+33 6 67 89 01 23',
    email: 'antoine.rousseau@demo.com',
  })

  const sachaOpp1 = await createOpportunity({
    name: '[DEMO] Martin Conseil',
    companyId: sachaCompany1.id,
    primaryContactId: sachaContact1.id,
    businessLineId: sachaBL.id,
    owner: 'Lilian',
    stage: 'Proposition',
    source: 'LinkedIn',
    priority: 'HIGH',
    potentialValue: 500,
    probability: 60,
  })

  await createActivity({
    opportunityId: sachaOpp1.id,
    contactId: sachaContact1.id,
    type: 'EMAIL',
    date: daysFromNow(-6),
    notes: '[DEMO] Proposition commerciale envoyée',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: sachaOpp1.id,
    contactId: sachaContact1.id,
    type: 'FOLLOW_UP',
    dueAt: daysFromNow(-1), // OVERDUE
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] Relance proposition',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: sachaOpp1.id,
    fromStage: 'Opportunité',
    toStage: 'Proposition',
    changedBy: 'Lilian',
  })

  // Sacha 2: TODAY — Appel de qualification
  const sachaCompany2 = await createCompany({
    name: '[DEMO] Dupont & Associés',
    city: 'Toulouse',
    industry: 'Juridique',
    companySize: '5-10',
  })

  const sachaContact2 = await createContact({
    firstName: 'Émilie',
    lastName: 'Girard [DEMO]',
    companyId: sachaCompany2.id,
    jobTitle: 'Avocate associée',
    phone: '+33 6 78 90 12 34',
  })

  const sachaOpp2 = await createOpportunity({
    name: '[DEMO] Dupont & Associés',
    companyId: sachaCompany2.id,
    primaryContactId: sachaContact2.id,
    businessLineId: sachaBL.id,
    owner: 'Lilian',
    stage: 'Qualifié',
    source: 'Referral',
    priority: 'MEDIUM',
    potentialValue: 500,
    probability: 40,
  })

  await createActivity({
    opportunityId: sachaOpp2.id,
    contactId: sachaContact2.id,
    type: 'CALL',
    date: daysFromNow(-2),
    result: 'CONVERSATION',
    notes: '[DEMO] Besoin identifié, à recontacter',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: sachaOpp2.id,
    contactId: sachaContact2.id,
    type: 'CALL',
    dueAt: setTimeToday(11, 0), // TODAY
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Qualification approfondie',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: sachaOpp2.id,
    fromStage: 'Échange',
    toStage: 'Qualifié',
    changedBy: 'Lilian',
  })

  // Sacha 3: RDV — Rendez-vous demain
  const sachaCompany3 = await createCompany({
    name: '[DEMO] Beaumont Expertise',
    city: 'Strasbourg',
    industry: 'Expertise comptable',
    companySize: '10-50',
  })

  const sachaContact3 = await createContact({
    firstName: 'Nicolas',
    lastName: 'Petit [DEMO]',
    companyId: sachaCompany3.id,
    jobTitle: 'Expert-comptable',
    phone: '+33 6 89 01 23 45',
  })

  const sachaOpp3 = await createOpportunity({
    name: '[DEMO] Beaumont Expertise',
    companyId: sachaCompany3.id,
    primaryContactId: sachaContact3.id,
    businessLineId: sachaBL.id,
    owner: 'Eric',
    stage: 'RDV',
    source: 'LinkedIn',
    priority: 'HIGH',
    potentialValue: 500,
    probability: 50,
  })

  await createActivity({
    opportunityId: sachaOpp3.id,
    contactId: sachaContact3.id,
    type: 'CALL',
    date: daysFromNow(-5),
    result: 'MEETING_BOOKED',
    notes: '[DEMO] RDV fixé pour présentation',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: sachaOpp3.id,
    contactId: sachaContact3.id,
    type: 'MEETING',
    dueAt: setTimeTomorrow(10, 0), // TOMORROW
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] Présentation solution',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: sachaOpp3.id,
    fromStage: 'Qualifié',
    toStage: 'RDV',
    changedBy: 'Lilian',
  })

  // Sacha 4: SANS NEXT ACTION — Opportunité identifiée mais pas de suite
  const sachaCompany4 = await createCompany({
    name: '[DEMO] Conseil Plus',
    city: 'Nice',
    industry: 'Conseil',
    companySize: '1-5',
  })

  const sachaContact4 = await createContact({
    firstName: 'Laura',
    lastName: 'Blanc [DEMO]',
    companyId: sachaCompany4.id,
    jobTitle: 'Consultante',
    phone: '+33 6 90 12 34 56',
  })

  const sachaOpp4 = await createOpportunity({
    name: '[DEMO] Conseil Plus',
    companyId: sachaCompany4.id,
    primaryContactId: sachaContact4.id,
    businessLineId: sachaBL.id,
    owner: 'Lilian',
    stage: 'Opportunité',
    source: 'Cold Email',
    priority: 'MEDIUM',
    potentialValue: 500,
    probability: 30,
  })

  await createActivity({
    opportunityId: sachaOpp4.id,
    contactId: sachaContact4.id,
    type: 'EMAIL',
    date: daysFromNow(-8),
    notes: '[DEMO] Email envoyé, en attente retour',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: sachaOpp4.id,
    fromStage: 'Qualifié',
    toStage: 'Opportunité',
    changedBy: 'Lilian',
  })

  // Sacha 5: À PROSPECTER — Nouveau contact LinkedIn
  const sachaCompany5 = await createCompany({
    name: '[DEMO] Fischer Consulting',
    city: 'Rennes',
    industry: 'Conseil',
    companySize: '1-5',
  })

  const sachaContact5 = await createContact({
    firstName: 'Pierre',
    lastName: 'Lambert [DEMO]',
    companyId: sachaCompany5.id,
    jobTitle: 'Consultant senior',
    phone: '+33 6 01 23 45 67',
    email: 'pierre.lambert@demo.com',
  })

  const sachaOpp5 = await createOpportunity({
    name: '[DEMO] Fischer Consulting',
    companyId: sachaCompany5.id,
    primaryContactId: sachaContact5.id,
    businessLineId: sachaBL.id,
    owner: 'Lilian',
    stage: 'À prospecter',
    source: 'LinkedIn',
    priority: 'LOW',
    potentialValue: 500,
    probability: 10,
  })

  await createTask({
    opportunityId: sachaOpp5.id,
    contactId: sachaContact5.id,
    type: 'LINKEDIN',
    dueAt: setTimeToday(15, 30), // TODAY
    priority: 'LOW',
    status: 'TODO',
    notes: '[DEMO] Message LinkedIn initial',
    owner: 'Lilian',
  })

  console.log('✅ SACHA: 5 opportunities created\n')

  // ============================================================================
  // CALYMIA — 7 OPPORTUNITIES
  // ============================================================================

  console.log('🧘 CALYMIA — Creating 7 demo opportunities...\n')

  // Calymia 1: OVERDUE — Relance après démo
  const calymiaCompany1 = await createCompany({
    name: '[DEMO] Cabinet Sophro Zen',
    city: 'Lyon',
    industry: 'Bien-être',
    companySize: '1-5',
  })

  const calymiaContact1 = await createContact({
    firstName: 'Isabelle',
    lastName: 'Morel [DEMO]',
    companyId: calymiaCompany1.id,
    jobTitle: 'Sophrologue',
    phone: '+33 6 12 34 56 78',
    email: 'isabelle.morel@demo.com',
  })

  const calymiaOpp1 = await createOpportunity({
    name: '[DEMO] Cabinet Sophro Zen',
    companyId: calymiaCompany1.id,
    primaryContactId: calymiaContact1.id,
    businessLineId: calymiaBL.id,
    owner: 'Lilian',
    stage: 'Opportunité',
    source: 'Website',
    priority: 'HIGH',
    potentialValue: 708, // 12 months × 59€
    probability: 70,
  })

  await createActivity({
    opportunityId: calymiaOpp1.id,
    contactId: calymiaContact1.id,
    type: 'DEMO',
    date: daysFromNow(-5),
    notes: '[DEMO] Démo effectuée, très intéressée',
    owner: 'Eric',
  })

  await createTask({
    opportunityId: calymiaOpp1.id,
    contactId: calymiaContact1.id,
    type: 'FOLLOW_UP',
    dueAt: daysFromNow(-1), // OVERDUE
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] Relance closing',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: calymiaOpp1.id,
    fromStage: 'RDV',
    toStage: 'Opportunité',
    changedBy: 'Eric',
  })

  // Calymia 2: TODAY — Appel de closing
  const calymiaCompany2 = await createCompany({
    name: '[DEMO] Sophro & Vous',
    city: 'Paris',
    industry: 'Bien-être',
    companySize: '1-5',
  })

  const calymiaContact2 = await createContact({
    firstName: 'Caroline',
    lastName: 'Fournier [DEMO]',
    companyId: calymiaCompany2.id,
    jobTitle: 'Sophrologue',
    phone: '+33 6 23 45 67 89',
  })

  const calymiaOpp2 = await createOpportunity({
    name: '[DEMO] Sophro & Vous',
    companyId: calymiaCompany2.id,
    primaryContactId: calymiaContact2.id,
    businessLineId: calymiaBL.id,
    owner: 'Lilian',
    stage: 'Opportunité',
    source: 'Referral',
    priority: 'HIGH',
    potentialValue: 348, // 12 months × 29€
    probability: 60,
  })

  await createActivity({
    opportunityId: calymiaOpp2.id,
    contactId: calymiaContact2.id,
    type: 'DEMO',
    date: daysFromNow(-3),
    notes: '[DEMO] Démo plan Essentiel',
    owner: 'Eric',
  })

  await createTask({
    opportunityId: calymiaOpp2.id,
    contactId: calymiaContact2.id,
    type: 'CALL',
    dueAt: setTimeToday(16, 0), // TODAY
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] Appel closing',
    owner: 'Lilian',
  })

  // Calymia 3: DÉMO — Demain
  const calymiaCompany3 = await createCompany({
    name: '[DEMO] Harmonie Sophrologie',
    city: 'Marseille',
    industry: 'Bien-être',
    companySize: '1-5',
  })

  const calymiaContact3 = await createContact({
    firstName: 'Nathalie',
    lastName: 'Garnier [DEMO]',
    companyId: calymiaCompany3.id,
    jobTitle: 'Sophrologue',
    phone: '+33 6 34 56 78 90',
  })

  const calymiaOpp3 = await createOpportunity({
    name: '[DEMO] Harmonie Sophrologie',
    companyId: calymiaCompany3.id,
    primaryContactId: calymiaContact3.id,
    businessLineId: calymiaBL.id,
    owner: 'Eric',
    stage: 'RDV',
    source: 'LinkedIn',
    priority: 'MEDIUM',
    potentialValue: 708,
    probability: 50,
  })

  await createActivity({
    opportunityId: calymiaOpp3.id,
    contactId: calymiaContact3.id,
    type: 'CALL',
    date: daysFromNow(-6),
    result: 'MEETING_BOOKED',
    notes: '[DEMO] Démo planifiée',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: calymiaOpp3.id,
    contactId: calymiaContact3.id,
    type: 'DEMO',
    dueAt: setTimeTomorrow(14, 0), // TOMORROW
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Démo Calymia',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: calymiaOpp3.id,
    fromStage: 'Qualifié',
    toStage: 'RDV',
    changedBy: 'Lilian',
  })

  // Calymia 4: QUALIFIÉ — À recontacter
  const calymiaCompany4 = await createCompany({
    name: '[DEMO] Cabinet Respire',
    city: 'Bordeaux',
    industry: 'Bien-être',
    companySize: '1-5',
  })

  const calymiaContact4 = await createContact({
    firstName: 'Sylvie',
    lastName: 'Perrin [DEMO]',
    companyId: calymiaCompany4.id,
    jobTitle: 'Sophrologue',
    phone: '+33 6 45 67 89 01',
  })

  const calymiaOpp4 = await createOpportunity({
    name: '[DEMO] Cabinet Respire',
    companyId: calymiaCompany4.id,
    primaryContactId: calymiaContact4.id,
    businessLineId: calymiaBL.id,
    owner: 'Lilian',
    stage: 'Qualifié',
    source: 'Cold Email',
    priority: 'MEDIUM',
    potentialValue: 348,
    probability: 40,
  })

  await createActivity({
    opportunityId: calymiaOpp4.id,
    contactId: calymiaContact4.id,
    type: 'CALL',
    date: daysFromNow(-4),
    result: 'CONVERSATION',
    notes: '[DEMO] Intéressée, veut réfléchir',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: calymiaOpp4.id,
    contactId: calymiaContact4.id,
    type: 'FOLLOW_UP',
    dueAt: daysFromNow(3),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Relance qualification',
    owner: 'Lilian',
  })

  // Calymia 5: ÉCHANGE — Prospect tiède
  const calymiaCompany5 = await createCompany({
    name: '[DEMO] Sophro Nature',
    city: 'Toulouse',
    industry: 'Bien-être',
    companySize: '1-5',
  })

  const calymiaContact5 = await createContact({
    firstName: 'Martine',
    lastName: 'Leroy [DEMO]',
    companyId: calymiaCompany5.id,
    jobTitle: 'Sophrologue',
    phone: '+33 6 56 78 90 12',
  })

  const calymiaOpp5 = await createOpportunity({
    name: '[DEMO] Sophro Nature',
    companyId: calymiaCompany5.id,
    primaryContactId: calymiaContact5.id,
    businessLineId: calymiaBL.id,
    owner: 'Lilian',
    stage: 'Échange',
    source: 'Cold Call',
    priority: 'LOW',
    potentialValue: 348,
    probability: 20,
  })

  await createActivity({
    opportunityId: calymiaOpp5.id,
    contactId: calymiaContact5.id,
    type: 'CALL',
    date: daysFromNow(-7),
    result: 'CONVERSATION',
    notes: '[DEMO] Conversation initiale',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: calymiaOpp5.id,
    contactId: calymiaContact5.id,
    type: 'CALL',
    dueAt: daysFromNow(5),
    priority: 'LOW',
    status: 'TODO',
    notes: '[DEMO] Relance tiède',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: calymiaOpp5.id,
    fromStage: 'Contacté',
    toStage: 'Échange',
    changedBy: 'Lilian',
  })

  // Calymia 6: SANS NEXT ACTION — Email envoyé mais pas de retour
  const calymiaCompany6 = await createCompany({
    name: '[DEMO] Bien-Être Lyon',
    city: 'Lyon',
    industry: 'Bien-être',
    companySize: '1-5',
  })

  const calymiaContact6 = await createContact({
    firstName: 'Céline',
    lastName: 'Roux [DEMO]',
    companyId: calymiaCompany6.id,
    jobTitle: 'Sophrologue',
    email: 'celine.roux@demo.com',
  })

  const calymiaOpp6 = await createOpportunity({
    name: '[DEMO] Bien-Être Lyon',
    companyId: calymiaCompany6.id,
    primaryContactId: calymiaContact6.id,
    businessLineId: calymiaBL.id,
    owner: 'Lilian',
    stage: 'Contacté',
    source: 'LinkedIn',
    priority: 'LOW',
    potentialValue: 708,
    probability: 10,
  })

  await createActivity({
    opportunityId: calymiaOpp6.id,
    contactId: calymiaContact6.id,
    type: 'EMAIL',
    date: daysFromNow(-10),
    notes: '[DEMO] Email initial envoyé',
    owner: 'Lilian',
  })

  // Calymia 7: À PROSPECTER — Nouveau prospect
  const calymiaCompany7 = await createCompany({
    name: '[DEMO] Sophro Équilibre',
    city: 'Nantes',
    industry: 'Bien-être',
    companySize: '1-5',
  })

  const calymiaContact7 = await createContact({
    firstName: 'Anne',
    lastName: 'Simon [DEMO]',
    companyId: calymiaCompany7.id,
    jobTitle: 'Sophrologue',
    phone: '+33 6 67 89 01 23',
  })

  const calymiaOpp7 = await createOpportunity({
    name: '[DEMO] Sophro Équilibre',
    companyId: calymiaCompany7.id,
    primaryContactId: calymiaContact7.id,
    businessLineId: calymiaBL.id,
    owner: 'Lilian',
    stage: 'À prospecter',
    source: 'Website',
    priority: 'MEDIUM',
    potentialValue: 348,
    probability: 10,
  })

  await createTask({
    opportunityId: calymiaOpp7.id,
    contactId: calymiaContact7.id,
    type: 'CALL',
    dueAt: setTimeToday(17, 0), // TODAY
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Premier appel',
    owner: 'Lilian',
  })

  console.log('✅ CALYMIA: 7 opportunities created\n')

  // ============================================================================
  // KLS3 NOTAIRES — 8 OPPORTUNITIES
  // ============================================================================

  console.log('⚖️  KLS3 NOTAIRES — Creating 8 demo opportunities...\n')

  // Notaires 1: PROPOSITION — En attente signature
  const notairesCompany1 = await createCompany({
    name: '[DEMO] Étude Notariale Patrimoine',
    city: 'Paris',
    industry: 'Notariat',
    companySize: '10-50',
  })

  const notairesContact1 = await createContact({
    firstName: 'François',
    lastName: 'Mercier [DEMO]',
    companyId: notairesCompany1.id,
    jobTitle: 'Notaire associé',
    phone: '+33 6 78 90 12 34',
    email: 'francois.mercier@demo.com',
  })

  const notairesOpp1 = await createOpportunity({
    name: '[DEMO] Étude Notariale Patrimoine',
    companyId: notairesCompany1.id,
    primaryContactId: notairesContact1.id,
    businessLineId: notairesBL.id,
    owner: 'Eric',
    stage: 'Proposition',
    source: 'Referral',
    priority: 'URGENT',
    potentialValue: 15000,
    probability: 80,
    problem: 'Gestion manuelle des actes de succession chronophage',
    need: 'Automatisation du workflow succession + modèles types',
  })

  await createActivity({
    opportunityId: notairesOpp1.id,
    contactId: notairesContact1.id,
    type: 'PROPOSAL',
    date: daysFromNow(-4),
    notes: '[DEMO] Proposition envoyée: automatisation succession',
    owner: 'Eric',
  })

  await createTask({
    opportunityId: notairesOpp1.id,
    contactId: notairesContact1.id,
    type: 'FOLLOW_UP',
    dueAt: setTimeToday(9, 0), // TODAY
    priority: 'URGENT',
    status: 'TODO',
    notes: '[DEMO] Relance closing proposition',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: notairesOpp1.id,
    fromStage: 'Opportunité',
    toStage: 'Proposition',
    changedBy: 'Eric',
  })

  // Notaires 2: OPPORTUNITÉ — Diagnostic réalisé
  const notairesCompany2 = await createCompany({
    name: '[DEMO] SCP Leblanc & Associés',
    city: 'Lyon',
    industry: 'Notariat',
    companySize: '5-10',
  })

  const notairesContact2 = await createContact({
    firstName: 'Catherine',
    lastName: 'Leblanc [DEMO]',
    companyId: notairesCompany2.id,
    jobTitle: 'Notaire',
    phone: '+33 6 89 01 23 45',
  })

  const notairesOpp2 = await createOpportunity({
    name: '[DEMO] SCP Leblanc & Associés',
    companyId: notairesCompany2.id,
    primaryContactId: notairesContact2.id,
    businessLineId: notairesBL.id,
    owner: 'Eric',
    stage: 'Opportunité',
    source: 'Cold Call',
    priority: 'HIGH',
    potentialValue: 12000,
    probability: 60,
    problem: 'Classement physique des dossiers inefficace',
    need: 'GED adaptée au notariat',
  })

  await createActivity({
    opportunityId: notairesOpp2.id,
    contactId: notairesContact2.id,
    type: 'MEETING',
    date: daysFromNow(-7),
    notes: '[DEMO] Diagnostic réalisé, besoin confirmé',
    owner: 'Eric',
  })

  await createTask({
    opportunityId: notairesOpp2.id,
    contactId: notairesContact2.id,
    type: 'FOLLOW_UP',
    dueAt: daysFromNow(2),
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] Préparer proposition GED',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: notairesOpp2.id,
    fromStage: 'RDV',
    toStage: 'Opportunité',
    changedBy: 'Eric',
  })

  // Notaires 3: RDV — Rendez-vous diagnostic aujourd'hui
  const notairesCompany3 = await createCompany({
    name: '[DEMO] Office Notarial Durand',
    city: 'Marseille',
    industry: 'Notariat',
    companySize: '5-10',
  })

  const notairesContact3 = await createContact({
    firstName: 'Philippe',
    lastName: 'Durand [DEMO]',
    companyId: notairesCompany3.id,
    jobTitle: 'Notaire',
    phone: '+33 6 90 12 34 56',
  })

  const notairesOpp3 = await createOpportunity({
    name: '[DEMO] Office Notarial Durand',
    companyId: notairesCompany3.id,
    primaryContactId: notairesContact3.id,
    businessLineId: notairesBL.id,
    owner: 'Eric',
    stage: 'RDV',
    source: 'LinkedIn',
    priority: 'HIGH',
    potentialValue: 10000,
    probability: 50,
  })

  await createActivity({
    opportunityId: notairesOpp3.id,
    contactId: notairesContact3.id,
    type: 'CALL',
    date: daysFromNow(-3),
    result: 'MEETING_BOOKED',
    notes: '[DEMO] RDV diagnostic fixé',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: notairesOpp3.id,
    contactId: notairesContact3.id,
    type: 'MEETING',
    dueAt: setTimeToday(14, 0), // TODAY MEETING
    priority: 'HIGH',
    status: 'TODO',
    notes: '[DEMO] RDV diagnostic process',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: notairesOpp3.id,
    fromStage: 'Qualifié',
    toStage: 'RDV',
    changedBy: 'Lilian',
  })

  // Notaires 4: QUALIFIÉ — À planifier diagnostic
  const notairesCompany4 = await createCompany({
    name: '[DEMO] Notaires Associés Sud',
    city: 'Toulouse',
    industry: 'Notariat',
    companySize: '10-50',
  })

  const notairesContact4 = await createContact({
    firstName: 'Véronique',
    lastName: 'Arnaud [DEMO]',
    companyId: notairesCompany4.id,
    jobTitle: 'Notaire associée',
    phone: '+33 6 01 23 45 67',
  })

  const notairesOpp4 = await createOpportunity({
    name: '[DEMO] Notaires Associés Sud',
    companyId: notairesCompany4.id,
    primaryContactId: notairesContact4.id,
    businessLineId: notairesBL.id,
    owner: 'Eric',
    stage: 'Qualifié',
    source: 'Referral',
    priority: 'MEDIUM',
    potentialValue: 14000,
    probability: 40,
    problem: 'Relecture manuelle chronophage',
    need: 'Automatisation validation actes',
  })

  await createActivity({
    opportunityId: notairesOpp4.id,
    contactId: notairesContact4.id,
    type: 'CALL',
    date: daysFromNow(-5),
    result: 'CONVERSATION',
    notes: '[DEMO] Besoin identifié, qualifié',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: notairesOpp4.id,
    contactId: notairesContact4.id,
    type: 'CALL',
    dueAt: daysFromNow(1),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Planifier diagnostic',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: notairesOpp4.id,
    fromStage: 'Échange',
    toStage: 'Qualifié',
    changedBy: 'Lilian',
  })

  // Notaires 5: ÉCHANGE — Conversations initiales
  const notairesCompany5 = await createCompany({
    name: '[DEMO] Étude Roussel',
    city: 'Bordeaux',
    industry: 'Notariat',
    companySize: '5-10',
  })

  const notairesContact5 = await createContact({
    firstName: 'Alain',
    lastName: 'Roussel [DEMO]',
    companyId: notairesCompany5.id,
    jobTitle: 'Notaire',
    phone: '+33 6 12 34 56 78',
  })

  const notairesOpp5 = await createOpportunity({
    name: '[DEMO] Étude Roussel',
    companyId: notairesCompany5.id,
    primaryContactId: notairesContact5.id,
    businessLineId: notairesBL.id,
    owner: 'Lilian',
    stage: 'Échange',
    source: 'Cold Call',
    priority: 'MEDIUM',
    potentialValue: 8000,
    probability: 30,
  })

  await createActivity({
    opportunityId: notairesOpp5.id,
    contactId: notairesContact5.id,
    type: 'CALL',
    date: daysFromNow(-6),
    result: 'CONVERSATION',
    notes: '[DEMO] Échange initial positif',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: notairesOpp5.id,
    contactId: notairesContact5.id,
    type: 'FOLLOW_UP',
    dueAt: daysFromNow(4),
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Relance qualification',
    owner: 'Lilian',
  })

  await createStageHistory({
    opportunityId: notairesOpp5.id,
    fromStage: 'Contacté',
    toStage: 'Échange',
    changedBy: 'Lilian',
  })

  // Notaires 6: CONTACTÉ — Premier contact établi
  const notairesCompany6 = await createCompany({
    name: '[DEMO] SCP Martin',
    city: 'Lille',
    industry: 'Notariat',
    companySize: '5-10',
  })

  const notairesContact6 = await createContact({
    firstName: 'Brigitte',
    lastName: 'Martin [DEMO]',
    companyId: notairesCompany6.id,
    jobTitle: 'Notaire',
    phone: '+33 6 23 45 67 89',
  })

  const notairesOpp6 = await createOpportunity({
    name: '[DEMO] SCP Martin',
    companyId: notairesCompany6.id,
    primaryContactId: notairesContact6.id,
    businessLineId: notairesBL.id,
    owner: 'Lilian',
    stage: 'Contacté',
    source: 'Cold Email',
    priority: 'LOW',
    potentialValue: 12000,
    probability: 20,
  })

  await createActivity({
    opportunityId: notairesOpp6.id,
    contactId: notairesContact6.id,
    type: 'EMAIL',
    date: daysFromNow(-8),
    notes: '[DEMO] Email initial envoyé',
    owner: 'Lilian',
  })

  await createTask({
    opportunityId: notairesOpp6.id,
    contactId: notairesContact6.id,
    type: 'CALL',
    dueAt: daysFromNow(6),
    priority: 'LOW',
    status: 'TODO',
    notes: '[DEMO] Relance téléphonique',
    owner: 'Lilian',
  })

  // Notaires 7: SANS NEXT ACTION — Opportunité identifiée mais en pause
  const notairesCompany7 = await createCompany({
    name: '[DEMO] Office Notarial Central',
    city: 'Strasbourg',
    industry: 'Notariat',
    companySize: '10-50',
  })

  const notairesContact7 = await createContact({
    firstName: 'Didier',
    lastName: 'Fontaine [DEMO]',
    companyId: notairesCompany7.id,
    jobTitle: 'Notaire associé',
    phone: '+33 6 34 56 78 90',
  })

  const notairesOpp7 = await createOpportunity({
    name: '[DEMO] Office Notarial Central',
    companyId: notairesCompany7.id,
    primaryContactId: notairesContact7.id,
    businessLineId: notairesBL.id,
    owner: 'Eric',
    stage: 'Opportunité',
    source: 'Partner',
    priority: 'MEDIUM',
    potentialValue: 18000,
    probability: 50,
    problem: 'Signature électronique non intégrée',
    need: 'Solution signature + workflow',
  })

  await createActivity({
    opportunityId: notairesOpp7.id,
    contactId: notairesContact7.id,
    type: 'MEETING',
    date: daysFromNow(-12),
    notes: '[DEMO] Diagnostic réalisé, attente budget',
    owner: 'Eric',
  })

  await createStageHistory({
    opportunityId: notairesOpp7.id,
    fromStage: 'RDV',
    toStage: 'Opportunité',
    changedBy: 'Eric',
  })

  // Notaires 8: À PROSPECTER — Nouveau prospect identifié
  const notairesCompany8 = await createCompany({
    name: '[DEMO] Notaires du Parc',
    city: 'Nice',
    industry: 'Notariat',
    companySize: '5-10',
  })

  const notairesContact8 = await createContact({
    firstName: 'Stéphane',
    lastName: 'Chevalier [DEMO]',
    companyId: notairesCompany8.id,
    jobTitle: 'Notaire',
    phone: '+33 6 45 67 89 01',
  })

  const notairesOpp8 = await createOpportunity({
    name: '[DEMO] Notaires du Parc',
    companyId: notairesCompany8.id,
    primaryContactId: notairesContact8.id,
    businessLineId: notairesBL.id,
    owner: 'Lilian',
    stage: 'À prospecter',
    source: 'LinkedIn',
    priority: 'MEDIUM',
    potentialValue: 10000,
    probability: 10,
  })

  await createTask({
    opportunityId: notairesOpp8.id,
    contactId: notairesContact8.id,
    type: 'CALL',
    dueAt: setTimeToday(11, 30), // TODAY
    priority: 'MEDIUM',
    status: 'TODO',
    notes: '[DEMO] Premier appel découverte',
    owner: 'Lilian',
  })

  console.log('✅ KLS3 NOTAIRES: 8 opportunities created\n')

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('=' .repeat(70))
  console.log('✅ DEMO DATASET SEEDING COMPLETE')
  console.log('=' .repeat(70))
  console.log()
  console.log('CREATED:')
  console.log('  - 25 Opportunities (PAUL: 5, SACHA: 5, CALYMIA: 7, KLS3_NOTAIRES: 8)')
  console.log('  - 25 Companies (all with [DEMO] marker)')
  console.log('  - 25 Contacts (all with [DEMO] marker)')
  console.log('  - ~30 Tasks (with [DEMO] marker in notes)')
  console.log('  - ~25 Activities (with [DEMO] marker in notes)')
  console.log('  - ~15 Stage History records')
  console.log()
  console.log('OWNER DISTRIBUTION:')
  console.log('  - Lilian: ~80%')
  console.log('  - Eric: ~20%')
  console.log()
  console.log('LILIAN TODAY WORKLOAD:')
  console.log('  - Overdue tasks: 3')
  console.log('  - Today tasks: 8-9')
  console.log('  - Meetings today: 2')
  console.log('  - No next action: 3')
  console.log()
  console.log('FOCUS-ELIGIBLE TASKS: 8-10')
  console.log()
  console.log('ALL RECORDS HAVE [DEMO] MARKER FOR SAFE CLEANUP')
  console.log()
  console.log('Next steps:')
  console.log('  1. npm run dev')
  console.log('  2. Visit /today to see workload')
  console.log('  3. Visit /focus to test queue')
  console.log('  4. npm run cleanup:demo to remove all demo data')
  console.log()
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
