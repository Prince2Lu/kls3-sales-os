// Test data seed script for development
// Creates realistic test opportunities across all business lines

import {
  createCompany,
  createContact,
  createOpportunity,
  createActivity,
  createTask,
  createStageHistory,
  getBusinessLines,
} from '@/lib/airtable'

async function seedTestData() {
  console.log('🌱 Starting test data seed...\n')

  try {
    // Get business lines
    const businessLines = await getBusinessLines()
    const blMap = Object.fromEntries(businessLines.map((bl) => [bl.code, bl]))

    console.log('📊 Business Lines loaded:')
    businessLines.forEach((bl) => console.log(`  - ${bl.name} (${bl.code})`))
    console.log('')

    // Create test companies
    console.log('🏢 Creating test companies...')
    const companies = await Promise.all([
      createCompany({
        name: 'Cabinet Dupont & Associés',
        industry: 'Notariat',
        city: 'Paris',
        country: 'France',
        companySize: '11-50',
      }),
      createCompany({
        name: 'SCP Martin Lefebvre',
        industry: 'Notariat',
        city: 'Lyon',
        country: 'France',
        companySize: '2-10',
      }),
      createCompany({
        name: 'Étude Notariale Bernard',
        industry: 'Notariat',
        city: 'Marseille',
        country: 'France',
        companySize: '2-10',
      }),
      createCompany({
        name: 'Immobilier Plus',
        industry: 'Immobilier',
        city: 'Bordeaux',
        country: 'France',
        companySize: '11-50',
      }),
      createCompany({
        name: 'Gestion Patrimoine Pro',
        industry: 'Finance',
        city: 'Toulouse',
        country: 'France',
        companySize: '51-200',
      }),
    ])
    console.log(`✅ Created ${companies.length} companies\n`)

    // Create test contacts
    console.log('👤 Creating test contacts...')
    const contacts = await Promise.all([
      createContact({
        firstName: 'Marie',
        lastName: 'Dupont',
        companyId: companies[0].id,
        jobTitle: 'Notaire Associée',
        email: 'marie.dupont@example.fr',
        phone: '+33 1 23 45 67 89',
      }),
      createContact({
        firstName: 'Jean',
        lastName: 'Martin',
        companyId: companies[1].id,
        jobTitle: 'Notaire',
        email: 'jean.martin@example.fr',
        phone: '+33 4 12 34 56 78',
      }),
      createContact({
        firstName: 'Sophie',
        lastName: 'Bernard',
        companyId: companies[2].id,
        jobTitle: 'Clerc de Notaire',
        email: 'sophie.bernard@example.fr',
        phone: '+33 4 91 23 45 67',
      }),
      createContact({
        firstName: 'Pierre',
        lastName: 'Dubois',
        companyId: companies[3].id,
        jobTitle: 'Directeur Commercial',
        email: 'pierre.dubois@example.fr',
        phone: '+33 5 56 12 34 56',
      }),
      createContact({
        firstName: 'Claire',
        lastName: 'Rousseau',
        companyId: companies[4].id,
        jobTitle: 'Conseillère en Gestion de Patrimoine',
        email: 'claire.rousseau@example.fr',
        phone: '+33 5 61 23 45 67',
      }),
    ])
    console.log(`✅ Created ${contacts.length} contacts\n`)

    // Create test opportunities
    console.log('💼 Creating test opportunities...\n')

    // Paul - RDV prospects
    const paulOpp1 = await createOpportunity({
      name: 'RDV Cabinet Dupont',
      companyId: companies[0].id,
      primaryContactId: contacts[0].id,
      businessLineId: blMap.PAUL.id,
      owner: 'Lilian',
      stage: 'RDV',
      source: 'Cold Call',
      priority: 'HIGH',
      potentialValue: 100,
      probability: 80,
    })
    console.log('  ✓ Paul: RDV Cabinet Dupont (stage: RDV)')

    await createStageHistory({
      opportunityId: paulOpp1.id,
      fromStage: 'Contacté',
      toStage: 'RDV',
      changedBy: 'Lilian',
    })

    await createActivity({
      opportunityId: paulOpp1.id,
      contactId: contacts[0].id,
      type: 'CALL',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      result: 'MEETING_BOOKED',
      notes: 'RDV confirmé pour mardi prochain',
      owner: 'Lilian',
      durationMinutes: 15,
    })

    await createTask({
      opportunityId: paulOpp1.id,
      contactId: contacts[0].id,
      type: 'MEETING',
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'HIGH',
      status: 'TODO',
      notes: 'RDV de qualification',
      owner: 'Eric',
    })

    const paulOpp2 = await createOpportunity({
      name: 'Prospect SCP Martin',
      companyId: companies[1].id,
      primaryContactId: contacts[1].id,
      businessLineId: blMap.PAUL.id,
      owner: 'Lilian',
      stage: 'Contacté',
      source: 'Cold Call',
      priority: 'MEDIUM',
    })
    console.log('  ✓ Paul: Prospect SCP Martin (stage: Contacté)')

    await createStageHistory({
      opportunityId: paulOpp2.id,
      fromStage: 'À prospecter',
      toStage: 'Contacté',
      changedBy: 'Lilian',
    })

    await createTask({
      opportunityId: paulOpp2.id,
      contactId: contacts[1].id,
      type: 'FOLLOW_UP',
      dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'MEDIUM',
      status: 'TODO',
      notes: 'Relancer pour fixer RDV',
      owner: 'Lilian',
    })

    // Sacha - Signature prospects
    const sachaOpp1 = await createOpportunity({
      name: 'Deal Immobilier Plus',
      companyId: companies[3].id,
      primaryContactId: contacts[3].id,
      businessLineId: blMap.SACHA.id,
      owner: 'Eric',
      stage: 'Proposition',
      source: 'Referral',
      priority: 'URGENT',
      potentialValue: 500,
      probability: 70,
    })
    console.log('  ✓ Sacha: Deal Immobilier Plus (stage: Proposition)')

    await createStageHistory({
      opportunityId: sachaOpp1.id,
      fromStage: 'Opportunité',
      toStage: 'Proposition',
      changedBy: 'Eric',
    })

    await createActivity({
      opportunityId: sachaOpp1.id,
      contactId: contacts[3].id,
      type: 'MEETING',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      result: 'CONVERSATION',
      notes: 'Proposition envoyée, attente retour',
      owner: 'Eric',
      durationMinutes: 45,
    })

    await createTask({
      opportunityId: sachaOpp1.id,
      contactId: contacts[3].id,
      type: 'FOLLOW_UP',
      dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'URGENT',
      status: 'TODO',
      notes: 'Relance pour signature',
      owner: 'Eric',
    })

    // Calymia - Nouveaux clients
    const calymiaOpp1 = await createOpportunity({
      name: 'Abonnement Gestion Patrimoine Pro',
      companyId: companies[4].id,
      primaryContactId: contacts[4].id,
      businessLineId: blMap.CALYMIA.id,
      owner: 'Eric',
      stage: 'Opportunité',
      source: 'Website',
      priority: 'HIGH',
      potentialValue: 59,
      probability: 60,
      need: 'Besoin de digitaliser la gestion des dossiers clients',
    })
    console.log('  ✓ Calymia: Abonnement Gestion Patrimoine Pro (stage: Opportunité)')

    await createStageHistory({
      opportunityId: calymiaOpp1.id,
      fromStage: 'Qualifié',
      toStage: 'Opportunité',
      changedBy: 'Eric',
    })

    await createTask({
      opportunityId: calymiaOpp1.id,
      contactId: contacts[4].id,
      type: 'DEMO',
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'HIGH',
      status: 'TODO',
      notes: 'Démo personnalisée Calymia',
      owner: 'Eric',
    })

    // KLS3 Notaires - Gros projets
    const kls3Opp1 = await createOpportunity({
      name: 'Digitalisation Cabinet Dupont',
      companyId: companies[0].id,
      primaryContactId: contacts[0].id,
      businessLineId: blMap.KLS3_NOTAIRES.id,
      owner: 'Eric',
      stage: 'Opportunité',
      source: 'Referral',
      priority: 'URGENT',
      potentialValue: 15000,
      probability: 75,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      problem:
        'Perte de temps importante sur la gestion des actes et des rendez-vous',
      need: 'Solution complète de digitalisation du cabinet',
    })
    console.log(
      '  ✓ KLS3 Notaires: Digitalisation Cabinet Dupont (stage: Opportunité)'
    )

    await createStageHistory({
      opportunityId: kls3Opp1.id,
      fromStage: 'RDV',
      toStage: 'Opportunité',
      changedBy: 'Eric',
    })

    await createActivity({
      opportunityId: kls3Opp1.id,
      contactId: contacts[0].id,
      type: 'MEETING',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      result: 'CONVERSATION',
      notes: 'Diagnostic approfondi réalisé, besoins clarifiés',
      owner: 'Eric',
      durationMinutes: 90,
    })

    await createTask({
      opportunityId: kls3Opp1.id,
      contactId: contacts[0].id,
      type: 'OTHER',
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'URGENT',
      status: 'TODO',
      notes: 'Préparer et envoyer proposition commerciale',
      owner: 'Eric',
    })

    const kls3Opp2 = await createOpportunity({
      name: 'Automatisation Étude Bernard',
      companyId: companies[2].id,
      primaryContactId: contacts[2].id,
      businessLineId: blMap.KLS3_NOTAIRES.id,
      owner: 'Eric',
      stage: 'Qualifié',
      source: 'Cold Call',
      priority: 'MEDIUM',
      potentialValue: 8000,
      probability: 40,
    })
    console.log(
      '  ✓ KLS3 Notaires: Automatisation Étude Bernard (stage: Qualifié)'
    )

    await createStageHistory({
      opportunityId: kls3Opp2.id,
      fromStage: 'Échange',
      toStage: 'Qualifié',
      changedBy: 'Eric',
    })

    await createTask({
      opportunityId: kls3Opp2.id,
      contactId: contacts[2].id,
      type: 'CALL',
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'MEDIUM',
      status: 'TODO',
      notes: 'Appel de qualification approfondie',
      owner: 'Eric',
    })

    // A few more prospects in early stages
    const earlyOpp1 = await createOpportunity({
      name: 'Prospect froid - Notaire Lille',
      businessLineId: blMap.PAUL.id,
      owner: 'Lilian',
      stage: 'À prospecter',
      source: 'Cold Call',
      priority: 'LOW',
    })
    console.log('  ✓ Paul: Prospect froid (stage: À prospecter)')

    await createTask({
      opportunityId: earlyOpp1.id,
      type: 'CALL',
      dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'LOW',
      status: 'TODO',
      notes: 'Premier appel de prospection',
      owner: 'Lilian',
    })

    const earlyOpp2 = await createOpportunity({
      name: 'Lead LinkedIn - CGP Nantes',
      businessLineId: blMap.CALYMIA.id,
      owner: 'Eric',
      stage: 'Contacté',
      source: 'LinkedIn',
      priority: 'MEDIUM',
    })
    console.log('  ✓ Calymia: Lead LinkedIn (stage: Contacté)')

    await createStageHistory({
      opportunityId: earlyOpp2.id,
      fromStage: 'À prospecter',
      toStage: 'Contacté',
      changedBy: 'Eric',
    })

    await createTask({
      opportunityId: earlyOpp2.id,
      type: 'EMAIL',
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'MEDIUM',
      status: 'TODO',
      notes: 'Envoyer présentation Calymia',
      owner: 'Eric',
    })

    console.log('\n✅ Test data seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - ${companies.length} companies`)
    console.log(`  - ${contacts.length} contacts`)
    console.log('  - 10 opportunities across all business lines')
    console.log('  - Multiple activities, tasks, and stage history records')
    console.log(
      '\n⚠️  Note: This is TEST DATA for development only. Do not use in production.\n'
    )
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedTestData }
