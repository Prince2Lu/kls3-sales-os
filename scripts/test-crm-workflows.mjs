// Isolated regression tests: no production data, credentials or network.
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)

async function load(entry, mocks = {}, globals = {}) {
  const result = await build({
    entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', write: false,
    external: ['react', 'react/jsx-runtime', 'react-dom/server'],
    plugins: [{ name: 'fixtures', setup(b) {
      b.onResolve({ filter: /./ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' } : undefined)
      b.onLoad({ filter: /./, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'js' }))
    } }],
  })
  const module = { exports: {} }
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, console, Date, Intl, Set, Map, state, ...globals })
  return module.exports
}
const state = { owner: 'Eric', created: [], updated: [], invalidations: [], activity: null }
const mocks = {
  '@/lib/airtable': `export async function createActivity(data) { state.created.push(data) }
    export async function getActivityById() { return state.activity }
    export async function updateActivity(id, data) { state.updated.push({id, data}) }
    export async function createTask(data) { state.created.push(data) }`,
  '@/lib/utils/current-owner': `export async function getCurrentOwner() { if (!state.owner) throw new Error('No session'); return state.owner }`,
  'next/cache': `export function revalidatePath(...args) { state.invalidations.push(args) }`,
}
const actions = await load('lib/actions/activity-actions.ts', mocks)
const tasks = await load('lib/actions/task-actions.ts', mocks)
const history = await load('lib/utils/contact-history.ts')
const timezone = await load('lib/utils/timezone.ts')
let tests = 0
async function test(name, run) { await run(); tests++; console.log(`OK ${name}`) }
await test('contact-only task supports a meeting without prospecting or opportunity', async () => {
  const result = await tasks.createManualTask({ contactId: 'brice', type: 'MEETING', dueAt: '2026-10-26T14:30:00Z', priority: 'MEDIUM' })
  assert.equal(result.success, true)
  const task = state.created.at(-1)
  assert.equal(task.contactId, 'brice'); assert.equal(task.status, 'TODO'); assert.equal(task.type, 'MEETING')
  assert.equal(task.opportunityId, undefined)
  assert.ok(state.invalidations.some(([p]) => p === '/planning'))
  assert.ok(state.invalidations.some(([p, kind]) => p === '/contacts/[id]' && kind === 'page'))
})
await test('future activity rejected without writing data', async () => {
  const count = state.created.length
  const result = await actions.createGenericActivity({ contactId: 'brice', type: 'MEETING', date: new Date(Date.now() + 86400000).toISOString() })
  assert.equal(result.success, false); assert.match(result.error, /Planifier/); assert.equal(state.created.length, count)
})
await test('past activity works without opportunity', async () => {
  const result = await actions.createGenericActivity({ contactId: 'brice', type: 'EMAIL', result: 'EMAIL_SENT', date: '2026-10-25T10:00:00Z', notes: 'Email externe' })
  assert.equal(result.success, true); assert.equal(state.created.at(-1).contactId, 'brice')
  assert.equal(state.created.at(-1).opportunityId, undefined)
})
await test('edit clears optional values and does not alter links or owner', async () => {
  state.activity = { id: 'a1', contactId: 'brice', coldCallTargetId: 't1', opportunityId: 'o1', relationshipId: 'r1', owner: 'Lilian', date: '2026-10-25T10:00:00Z' }
  const result = await actions.updateGenericActivity('a1', { type: 'MEETING', date: state.activity.date, result: '', notes: '', contactId: 'other', owner: 'Eric' })
  assert.equal(result.success, true)
  const patch = state.updated.at(-1).data
  assert.equal(patch.notes, ''); assert.equal(patch.result, ''); assert.equal(patch.durationMinutes, null)
  for (const key of ['owner', 'contactId', 'opportunityId', 'coldCallTargetId', 'relationshipId']) assert.ok(!(key in patch))
})
await test('legacy future activity may be corrected without silently changing its date', async () => {
  state.activity.date = new Date(Date.now() + 86400000).toISOString()
  assert.equal((await actions.updateGenericActivity('a1', { type: 'MEETING', date: state.activity.date, notes: 'Corrigé' })).success, true)
})
await test('invalid task date/type rejected', async () => {
  const n = state.created.length
  assert.equal((await tasks.createManualTask({ contactId: 'brice', type: 'BAD', dueAt: 'invalid', priority: 'MEDIUM' })).success, false)
  assert.equal(state.created.length, n)
})
await test('all mutations reject unauthenticated calls', async () => {
  state.owner = null
  const n = state.created.length, edits = state.updated.length
  assert.equal((await actions.createGenericActivity({ contactId: 'brice', type: 'NOTE', date: '2026-10-25T10:00:00Z' })).success, false)
  assert.equal((await actions.updateGenericActivity('a1', { type: 'NOTE', date: '2026-10-25T10:00:00Z' })).success, false)
  assert.equal((await tasks.createManualTask({ contactId: 'brice', type: 'MEETING', dueAt: '2026-10-26T14:30:00Z', priority: 'MEDIUM' })).success, false)
  assert.equal(state.created.length, n); assert.equal(state.updated.length, edits)
  state.owner = 'Eric'
})
await test('contact history includes archived-target and opportunity-only records without leaking other contacts', () => {
  const targets = [{ id: 't1', contactId: 'brice', archived: true }]
  const opportunities = [{ id: 'o1', primaryContactId: 'brice' }]
  const items = [{ id: 'direct', contactId: 'brice' }, { id: 'target', coldCallTargetId: 't1' }, { id: 'opp', opportunityId: 'o1' }, { id: 'other', contactId: 'other', coldCallTargetId: 't1', opportunityId: 'o1' }, { id: 'unrelated' }]
  assert.equal(history.getContactHistory(items, 'brice', targets, opportunities).map(x => x.id).join(','), 'direct,target,opp')
})
await test('Paris form dates round-trip across winter, summer and UTC midnight', () => {
  for (const [instant, date, time] of [
    ['2026-10-26T14:30:00.000Z', '2026-10-26', '15:30'],
    ['2026-07-01T13:30:00.000Z', '2026-07-01', '15:30'],
    ['2026-07-01T22:30:00.000Z', '2026-07-02', '00:30'],
  ]) {
    const form = history.getParisFormDateTime(instant)
    assert.equal(form.date, date); assert.equal(form.time, time)
    assert.equal(timezone.createISOFromParisDateTime(form.date, form.time), instant)
  }
})
await test('no CRM read is silently capped (maxRecords) except the recent import batches list', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) ? [path] : []
  })
  const allowed = ['getImportBatches({ maxRecords: 50 })']
  const offenders = [...walk('app'), ...walk('lib')].flatMap((file) =>
    readFileSync(file, 'utf8').split('\n')
      .filter((line) => /maxRecords: \d{2,}/.test(line) && !allowed.some((ok) => line.includes(ok)))
      .map((line) => `${file}: ${line.trim()}`))
  assert.equal(offenders.length, 0, offenders.join('\n'))
})
const focusState = { target: null, statusChanges: [], conversions: [], created: [], updatedOpps: [], updatedTasks: [] }
state.focus = focusState
const focus = await load('app/focus/actions.ts', {
  '@/lib/airtable': `export async function createActivity(data) { state.focus.created.push({ kind: 'activity', ...data }) }
    export async function createTask(data) { state.focus.created.push({ kind: 'task', ...data }) }
    export async function updateTask(id, data) { state.focus.updatedTasks.push({ id, data }) }
    export async function updateOpportunity(id, data) { state.focus.updatedOpps.push({ id, data }) }
    export async function createStageHistory() {}
    export async function getTasks() { return [] }
    export async function getColdCallTargetById() { return state.focus.target }`,
  '@/lib/cold-call/status-manager': `export async function changeColdCallStatus(params) { state.focus.statusChanges.push(params); return { success: true, statusChanged: true } }`,
  '@/lib/prospecting/opportunity-converter': `export async function convertProspectingTargetToOpportunity(params) { state.focus.conversions.push(params); return { success: true, opportunityId: 'opp-new' } }`,
  'next/cache': `export function revalidatePath() {}`,
})
const focusConversation = (overrides = {}) => focus.processConversation({ taskId: 'task1', opportunityId: null, contactId: 'c1', coldCallTargetId: 't1', owner: 'Lilian', currentStage: null, ...overrides })
await test('Focus conversation keeps the prospect in prospecting: no Opportunity, status Échange', async () => {
  focusState.target = { id: 't1', callStatus: 'À appeler' }
  assert.equal((await focusConversation()).success, true)
  assert.equal(focusState.conversions.length, 0)
  assert.equal(focusState.statusChanges.at(-1).targetId, 't1'); assert.equal(focusState.statusChanges.at(-1).toStatus, 'Échange')
  const activity = focusState.created.find((item) => item.kind === 'activity')
  assert.equal(activity.result, 'CONVERSATION'); assert.equal(activity.coldCallTargetId, 't1'); assert.equal(activity.opportunityId, undefined)
  assert.equal(focusState.updatedTasks.at(-1).data.status, 'DONE')
})
await test('Focus conversation never moves a qualified or converted prospect backwards', async () => {
  for (const callStatus of ['Échange', 'Qualifié', 'RDV booké', 'Converti', 'Pas intéressé', 'Mauvais numéro']) {
    const before = focusState.statusChanges.length
    focusState.target = { id: 't1', callStatus }
    await focusConversation()
    assert.equal(focusState.statusChanges.length, before, callStatus)
  }
  assert.equal(focusState.conversions.length, 0)
})
await test('Focus conversation on an existing Opportunity keeps its links and creates nothing new', async () => {
  const before = focusState.statusChanges.length
  await focusConversation({ opportunityId: 'o1', currentStage: 'RDV' })
  assert.equal(focusState.conversions.length, 0); assert.equal(focusState.statusChanges.length, before)
  assert.equal(focusState.created.at(-1).opportunityId, 'o1'); assert.equal(focusState.updatedOpps.length, 0)
})
await test('Focus booked meeting still converts the prospect at stage RDV', async () => {
  await focus.processMeetingBooked({ taskId: 'task2', opportunityId: null, contactId: 'c1', coldCallTargetId: 't1', owner: 'Lilian', currentStage: null, meetingDate: '2026-12-01', meetingTime: '10:00' })
  assert.equal(focusState.conversions.length, 1)
  assert.equal(focusState.conversions[0].initialStage, 'RDV'); assert.equal(focusState.conversions[0].activityResult, 'MEETING_BOOKED')
})
const { renderToStaticMarkup } = require('react-dom/server')
const today = await load('app/today/today-tasks-section.tsx', {
  '@/lib/airtable': `export async function getOpportunities() { return [] }
    export async function getCompanies() { return [{id: 'c1', name: 'SIE Groupe'}] }
    export async function getContacts() { return [{id: 'brice', firstName: 'Brice', lastName: 'Miotto', companyId: 'c1', businessLineIds: []}, {id: 'solo', firstName: 'Contact', lastName: 'Solo', businessLineIds: []}] }
    export async function getColdCallTargets() { return [] }`,
  'next/navigation': `export function useRouter() { return { refresh() {} } }`,
  'next/link': `const React = require('react'); export default function Link({href, children, ...props}) { return React.createElement('a', {href, ...props}, children) }`,
  './actions': `export async function completeTaskAction() {} export async function cancelTaskAction() {}`,
})
await test('Today shows the company and contact for a standalone meeting', async () => {
  const tree = await today.TodayTasksSection({ tasks: [{id: 'm1', type: 'MEETING', contactId: 'brice', status: 'TODO', owner: 'Eric'}], businessLineMap: {} })
  const html = renderToStaticMarkup(tree)
  assert.match(html, /SIE Groupe/); assert.match(html, /Brice Miotto/)
})
await test('Today still identifies a contact with no company', async () => {
  const tree = await today.TodayTasksSection({ tasks: [{id: 'm2', type: 'MEETING', contactId: 'solo', status: 'TODO', owner: 'Eric'}], businessLineMap: {} })
  const html = renderToStaticMarkup(tree)
  assert.match(html, /Contact Solo/); assert.match(html, /href="\/contacts\/solo"/)
})
// Airtable HTTP layer: fetch mocked, retry delays recorded instead of awaited
const http = { calls: [], responses: [], delays: [], active: 0, maxActive: 0 }
function airtableResponse(status, body = {}, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}
const airtable = await load('lib/airtable/client.ts', {
  './config': `export const TABLE_NAMES = new Proxy({}, { get: (_, name) => name })
    export function getTableUrl(table) { return 'https://api.airtable.test/v0/base/' + table }
    export function getHeaders() { return { Authorization: 'Bearer test', 'Content-Type': 'application/json' } }`,
  'next/cache': `export function unstable_cache(fn) { return fn }`,
}, {
  process: { env: {} }, URL, Response,
  setTimeout: (resolve, ms) => { http.delays.push(ms); setImmediate(resolve) },
  fetch: async (url, init) => {
    http.calls.push({ url, method: init.method })
    http.active++; http.maxActive = Math.max(http.maxActive, http.active)
    await new Promise(resolve => setImmediate(resolve))
    http.active--
    const next = http.responses.shift()
    return typeof next === 'function' ? next() : next ?? airtableResponse(200, { records: [] })
  },
})
const silentWarn = async (run) => { const warn = console.warn; console.warn = () => {}; try { await run() } finally { console.warn = warn } }
function resetHttp(responses) { Object.assign(http, { calls: [], responses, delays: [], active: 0, maxActive: 0 }) }
const goalRecord = { id: 'g1', fields: { 'Business Line': ['bl1'], Metric: 'PAID_MEETINGS', Target: 8 } }
await test('Airtable read retries after 429 and returns the data', () => silentWarn(async () => {
  resetHttp([airtableResponse(429), airtableResponse(200, { records: [goalRecord] })])
  const goals = await airtable.getGoals()
  assert.equal(goals.length, 1); assert.equal(goals[0].id, 'g1')
  assert.equal(http.calls.length, 2); assert.deepEqual(http.delays, [1000])
  assert.match(http.calls[0].url, /pageSize=100/)
}))
await test('Airtable 429 on every attempt throws AirtableError after 3 retries', () => silentWarn(async () => {
  resetHttp([429, 429, 429, 429, 429].map(status => () => airtableResponse(status)))
  await assert.rejects(airtable.getTasks(), error => error.name === 'AirtableError' && error.statusCode === 429)
  assert.equal(http.calls.length, 4); assert.deepEqual(http.delays, [1000, 2000, 4000])
}))
await test('Airtable honours Retry-After', () => silentWarn(async () => {
  resetHttp([airtableResponse(429, {}, { 'Retry-After': '30' }), airtableResponse(200, { records: [] })])
  await airtable.getContacts()
  assert.deepEqual(http.delays, [30000])
}))
await test('Airtable write receiving 500 is not replayed', () => silentWarn(async () => {
  resetHttp([airtableResponse(500), airtableResponse(200, { id: 't1', fields: {} })])
  await assert.rejects(airtable.createTask({ type: 'CALL', dueAt: '2026-12-01T09:00:00Z', priority: 'MEDIUM', status: 'TODO', owner: 'Eric' }), error => error.statusCode === 500)
  assert.equal(http.calls.length, 1); assert.equal(http.calls[0].method, 'POST'); assert.deepEqual(http.delays, [])
}))
await test('Airtable write is retried on 429 only', () => silentWarn(async () => {
  resetHttp([airtableResponse(429), airtableResponse(200, { id: 't1', fields: {} })])
  await airtable.deleteTask('t1')
  assert.deepEqual(http.calls.map(call => call.method), ['DELETE', 'DELETE'])
}))
await test('Airtable never runs more than 4 requests at once', async () => {
  resetHttp([])
  await Promise.all(Array.from({ length: 12 }, (_, index) => airtable.airtableFetch(`https://api.airtable.test/v0/base/T${index}`)))
  assert.equal(http.calls.length, 12); assert.equal(http.maxActive, 4)
})
console.log(`${tests} CRM regression tests passed`)
