// Diagnose Focus-created tasks for Notaire Test 1
// Compare with normal tasks to identify missing fields

import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

const envResult = loadEnv({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.error('❌ Failed to load .env.local:', envResult.error)
  process.exit(1)
}

import { getOpportunities, getTasks, getActivities } from '@/lib/airtable'

async function diagnose() {
  console.log('🔍 DIAGNOSING FOCUS WORKFLOW\n')

  // Find Notaire Test 1
  const opportunities = await getOpportunities({ maxRecords: 100 })
  const notaireTest1 = opportunities.find((o) => o.name === 'Notaire Test 1')

  if (!notaireTest1) {
    console.log('❌ Notaire Test 1 opportunity not found')
    return
  }

  console.log(`✅ Found: ${notaireTest1.name} (${notaireTest1.id})`)
  console.log(`   Stage: ${notaireTest1.stage}`)
  console.log(`   Owner: ${notaireTest1.owner}\n`)

  // Get all tasks
  const allTasks = await getTasks({ maxRecords: 500 })
  const opportunityTasks = allTasks.filter((t) => t.opportunityId === notaireTest1.id)

  console.log(`📋 TASKS FOR THIS OPPORTUNITY: ${opportunityTasks.length}\n`)

  opportunityTasks.forEach((task, idx) => {
    console.log(`TASK ${idx + 1}:`)
    console.log(`  ID: ${task.id}`)
    console.log(`  Type: ${task.type}`)
    console.log(`  Status: ${task.status}`)
    console.log(`  Priority: ${task.priority || 'NOT SET'}`)
    console.log(`  Due At: ${task.dueAt || 'NOT SET'}`)
    console.log(`  Notes: ${task.notes || 'NOT SET'}`)
    console.log(`  Owner: ${task.owner}`)
    console.log(`  Created At: ${task.createdAt}`)
    console.log(`  Completed At: ${task.completedAt || 'NOT SET'}`)
    console.log()
  })

  // Identify which are TODO
  const todoTasks = opportunityTasks.filter((t) => t.status === 'TODO')
  console.log(`TODO TASKS: ${todoTasks.length}`)
  todoTasks.forEach((task) => {
    console.log(`  - ${task.type} due ${task.dueAt} (${task.id})`)
  })
  console.log()

  // Sort by Due At to find next action
  const sortedTodo = [...todoTasks].sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return 0
    if (!a.dueAt) return 1
    if (!b.dueAt) return -1
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  })

  if (sortedTodo.length > 0) {
    console.log(`NEXT ACTION (earliest TODO):`)
    const next = sortedTodo[0]
    console.log(`  Type: ${next.type}`)
    console.log(`  Due: ${next.dueAt}`)
    console.log(`  Notes: ${next.notes}`)
    console.log()
  }

  // Get activities
  const allActivities = await getActivities({ maxRecords: 500 })
  const opportunityActivities = allActivities.filter(
    (a) => a.opportunityId === notaireTest1.id
  )

  console.log(`📝 ACTIVITIES FOR THIS OPPORTUNITY: ${opportunityActivities.length}\n`)

  // Show recent NO_ANSWER activities
  const noAnswerActivities = opportunityActivities.filter((a) => a.result === 'NO_ANSWER')
  console.log(`NO_ANSWER ACTIVITIES: ${noAnswerActivities.length}`)
  noAnswerActivities.forEach((act) => {
    console.log(`  - ${act.type} on ${act.date} - ${act.result}`)
    console.log(`    Notes: ${act.notes || 'NONE'}`)
  })
  console.log()

  // Check for tasks created today (likely Focus-created)
  const today = new Date().toISOString().split('T')[0]
  const recentTasks = opportunityTasks.filter((t) => t.createdAt.startsWith(today))

  console.log(`TASKS CREATED TODAY: ${recentTasks.length}`)
  recentTasks.forEach((task) => {
    console.log(`  ID: ${task.id}`)
    console.log(`  Type: ${task.type}`)
    console.log(`  Status: ${task.status}`)
    console.log(`  Due At: ${task.dueAt}`)
    console.log(`  Notes: ${task.notes}`)
    console.log()
  })
}

diagnose()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
