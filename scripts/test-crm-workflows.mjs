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
const early = await load('lib/prospecting/early-opportunities.ts')
await test('early opportunities are classified A (meeting), B (conversation only), C (economic signal)', async () => {
  const opp = (id, stage, extra = {}) => ({ id, stage, businessLineId: 'bl', owner: 'Lilian', createdAt: `2026-10-0${id.length}`, potentialValue: null, ...extra })
  const rows = early.classifyEarlyOpportunities({
    opportunities: [opp('a', 'Échange'), opp('bb', 'Échange'), opp('ccc', 'Qualifié', { potentialValue: 12000 }), opp('dddd', 'RDV'), opp('eeeee', 'Contacté')],
    activities: [
      { opportunityId: 'a', type: 'CALL', result: 'MEETING_BOOKED' },
      { opportunityId: 'bb', type: 'CALL', result: 'CONVERSATION' },
      { opportunityId: 'bb', type: 'CALL', result: 'CONVERSATION' },
    ],
    tasks: [{ opportunityId: 'bb', type: 'FOLLOW_UP', status: 'TODO' }, { opportunityId: 'eeeee', type: 'MEETING', status: 'CANCELLED' }],
    valueEvents: [],
    targets: [{ opportunityId: 'bb', callStatus: 'Converti' }],
  })
  assert.equal(rows.map((r) => `${r.id}:${r.group}`).join(' '), 'a:A bb:B ccc:C eeeee:B', 'RDV stage excluded, cancelled meeting ignored')
  const b = rows.find((r) => r.id === 'bb')
  assert.equal(b.activityResults.CONVERSATION, 2); assert.equal(b.hasTodoTask, true); assert.equal(b.linkedTargetStatuses[0], 'Converti')
  const summary = early.summarizeEarlyOpportunities(rows)
  assert.equal(summary.total, 4); assert.equal(summary.byGroup.B, 2)
})
const ownerOptionsLib = await load('lib/users/owner-options.ts')
const ownerState = { users: [] }
const ownersLib = await load('lib/users/owners.ts', { '@/lib/airtable': `export async function getUsers() { return globalThis.ownerState.users }` }, { globalThis: { ownerState } })
await test('owners come from active USERS, a third salesperson works without code change', async () => {
  ownerState.users = [
    { name: 'Lilian', active: true, passwordHash: 'x' }, { name: 'Eric', active: true, passwordHash: 'x' },
    { name: 'Camille', active: true, passwordHash: 'x' }, { name: 'Ancien', active: false, passwordHash: 'x' },
  ]
  assert.equal((await ownersLib.getActiveOwners()).join(','), 'Camille,Eric,Lilian')
  assert.equal(await ownersLib.isValidOwner('Camille'), true)
  assert.equal(await ownersLib.isValidOwner('Ancien'), false)
  await ownersLib.assertValidOwner(undefined)
  await assert.rejects(ownersLib.assertValidOwner('Inconnu'), /utilisateur actif/)
  assert.equal(ownerOptionsLib.ownerOptions(['Eric', 'Lilian'], 'Ancien', 'Eric', null).join(','), 'Eric,Lilian,Ancien', 'a stored inactive owner stays selectable')
})
const currentOwnerLib = await load('lib/utils/current-owner.ts', { '@/auth': `export async function auth() { return globalThis.ownerState.session }` }, { globalThis: { ownerState }, process: { env: { NODE_ENV: 'production' } } })
await test('the current owner is the signed-in user name, whatever the name', async () => {
  ownerState.session = { user: { name: 'Camille' } }
  assert.equal(await currentOwnerLib.getCurrentOwner(), 'Camille')
  ownerState.session = null
  await assert.rejects(currentOwnerLib.getCurrentOwner(), /No authenticated user session/)
})
const throttle = await load('lib/auth/login-throttle.ts')
await test('login is refused after 5 failures for 15 minutes, then allowed again', async () => {
  const t0 = Date.UTC(2026, 10, 27, 9, 0)
  for (let i = 0; i < 5; i++) { assert.equal(throttle.isLoginBlocked('x@kls3.test', t0), false); throttle.recordLoginFailure('x@kls3.test', t0) }
  assert.equal(throttle.isLoginBlocked('x@kls3.test', t0 + 60000), true)
  assert.equal(throttle.isLoginBlocked('other@kls3.test', t0), false, 'other accounts are not affected')
  assert.equal(throttle.isLoginBlocked('x@kls3.test', t0 + 15 * 60000), false)
  throttle.recordLoginFailure('y@kls3.test', t0); throttle.clearLoginFailures('y@kls3.test')
  assert.equal(throttle.isLoginBlocked('y@kls3.test', t0), false)
})
const sessionCheck = await load('lib/auth/session-check.ts')
await test('a session ends within 15 minutes once the user is deactivated, and survives an Airtable outage', async () => {
  const now = Date.UTC(2026, 10, 27, 9, 0)
  const token = { email: 'lilian@kls3.test', name: 'Lilian', role: 'SALES', checkedAt: now - 60000 }
  let reads = 0
  const inactive = async () => { reads++; return { name: 'Lilian', role: 'SALES', active: false } }
  assert.equal(await sessionCheck.recheckSessionUser(token, inactive, now), token, 'checked less than 15 min ago: no read')
  assert.equal(reads, 0)
  const stale = { ...token, checkedAt: now - 16 * 60000 }
  assert.equal(await sessionCheck.recheckSessionUser(stale, inactive, now), null)
  assert.equal(await sessionCheck.recheckSessionUser(stale, async () => null, now), null, 'removed user')
  const outage = async () => { throw new Error('Airtable down') }
  assert.equal(await sessionCheck.recheckSessionUser(stale, outage, now), stale)
  const refreshed = await sessionCheck.recheckSessionUser(stale, async () => ({ name: 'Lilian S', role: 'SALES_DIRECTOR', active: true }), now)
  assert.equal(refreshed.role, 'SALES_DIRECTOR'); assert.equal(refreshed.name, 'Lilian S'); assert.equal(refreshed.checkedAt, now)
})
const formula = await load('lib/airtable/formula.ts')
await test('values put in Airtable formulas cannot break out of the string', async () => {
  assert.equal(formula.formulaString('eric@kls3.test'), '"eric@kls3.test"')
  assert.equal(formula.formulaString('x" OR "1"="1'), '"x\\" OR \\"1\\"=\\"1"')
  assert.equal(formula.formulaString('a\\'), '"a\\\\"')
  assert.equal(formula.formulaString(null), '""')
})
const rateLimit = await load('lib/auth/rate-limit.ts')
await test('public card events are limited per visitor and card', async () => {
  const t0 = 1_000_000
  for (let i = 0; i < 60; i++) assert.equal(rateLimit.allowRequest('k', 60, 60000, t0), true)
  assert.equal(rateLimit.allowRequest('k', 60, 60000, t0 + 1), false)
  assert.equal(rateLimit.allowRequest('other', 60, 60000, t0 + 1), true)
  assert.equal(rateLimit.allowRequest('k', 60, 60000, t0 + 60000), true)
})
const roleState = { session: null }
const roles = await load('lib/auth/roles.ts', { '@/auth': `export async function auth() { return globalThis.roleState.session }` }, { globalThis: { roleState } })
await test('sensitive actions are reserved to ADMIN and SALES_DIRECTOR roles', async () => {
  roleState.session = { user: { name: 'Eric', role: 'ADMIN' } }; assert.equal(await roles.denyUnlessRole(), null)
  roleState.session = { user: { name: 'Lilian', role: 'SALES_DIRECTOR' } }; assert.equal(await roles.denyUnlessRole(), null)
  roleState.session = { user: { name: 'Camille', role: 'SALES' } }; assert.match(await roles.denyUnlessRole(), /réservée/)
  roleState.session = null; assert.match(await roles.denyUnlessRole(), /réservée/)
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
const forgotten = await load('lib/prospecting/forgotten-files.ts')
await test('Forgotten files: engaged prospects idle 14+ days without open task, never in bulk', () => {
  const now = new Date('2026-11-27T12:00:00Z')
  const base = { contactId: 'c1', businessLineId: 'bl', owner: 'Lilian', archived: false, opportunityId: null, createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z' }
  const targets = [
    { ...base, id: 't-old', companyId: 'co1', callStatus: 'Échange' },
    { ...base, id: 't-qualified', companyId: 'co2', callStatus: 'Qualifié', updatedAt: '2026-11-05T10:00:00Z' },
    { ...base, id: 't-recent-call', companyId: 'co3', callStatus: 'Échange' },
    { ...base, id: 't-task', companyId: 'co4', callStatus: 'À rappeler' },
    { ...base, id: 't-new', companyId: 'co5', callStatus: 'À appeler' },
    { ...base, id: 't-opp', companyId: 'co6', callStatus: 'Échange', opportunityId: 'o1' },
    { ...base, id: 't-archived', companyId: 'co7', callStatus: 'Échange', archived: true },
    { ...base, id: 't-other', companyId: 'co8', callStatus: 'Échange', owner: 'Eric' },
    { ...base, id: 't-done-task', companyId: 'co9', callStatus: 'À rappeler' },
  ]
  const tasks = [
    { id: 'k1', coldCallTargetId: 't-task', status: 'TODO' },
    { id: 'k2', coldCallTargetId: 't-done-task', status: 'DONE' },
  ]
  const activities = [
    { id: 'a1', coldCallTargetId: 't-recent-call', date: '2026-11-20T10:00:00Z' },
    { id: 'a2', coldCallTargetId: 't-old', date: '2026-10-10T10:00:00Z' },
  ]
  const files = forgotten.findForgottenFiles({ targets, tasks, activities, owner: 'Lilian', now })
  assert.equal(files.map(file => file.targetId).join(','), 't-qualified,t-old,t-done-task')
  assert.equal(files[1].idleDays, 48); assert.equal(files[1].lastTouchAt, '2026-10-10T10:00:00Z')
  assert.equal(files[0].idleDays, 22)
})
await test('Forgotten files: proposed follow-up is the next business day at 09:30', () => {
  const due = new Date(forgotten.proposedFollowUpAt(new Date(2026, 10, 27, 18, 0)))
  assert.equal(due.getDay(), 1); assert.equal(due.getDate(), 30); assert.equal(due.getHours(), 9); assert.equal(due.getMinutes(), 30)
})
const goalProgress = await load('lib/goals/goal-progress.ts')
await test('Goals: metric and period codes are normalised, unknown codes stay unknown', () => {
  assert.equal(goalProgress.normalizeGoalMetric('PAID_MEETINGS'), 'PAID_MEETINGS')
  assert.equal(goalProgress.normalizeGoalMetric('RDV rémunérés'), 'PAID_MEETINGS')
  assert.equal(goalProgress.normalizeGoalMetric('Nouveaux clients'), 'NEW_SUBSCRIPTIONS')
  assert.equal(goalProgress.normalizeGoalMetric('Signed projects'), 'SIGNATURES')
  assert.equal(goalProgress.normalizeGoalMetric('Taux de closing'), null)
  assert.equal(goalProgress.normalizeGoalPeriod('Mensuel'), 'month')
  assert.equal(goalProgress.normalizeGoalPeriod('MONTHLY'), 'month')
  assert.equal(goalProgress.normalizeGoalPeriod('Trimestre'), 'quarter')
  assert.equal(goalProgress.normalizeGoalPeriod(undefined), null)
})
await test('Goals: actuals use confirmed Value Events and attributed Activities only', () => {
  const goals = [
    { id: 'g-paul', businessLineId: 'bl-paul', metric: 'PAID_MEETINGS', period: 'Monthly', target: 8, ambitiousTarget: 12, startDate: null, endDate: null },
    { id: 'g-calls', businessLineId: 'bl-paul', metric: 'Appels', period: 'Mensuel', target: 100, ambitiousTarget: null, startDate: null, endDate: null },
    { id: 'g-revenue', businessLineId: 'bl-kls3', metric: 'CA', period: 'Month', target: 12000, ambitiousTarget: null, startDate: '2026-11-01', endDate: '2026-11-30' },
    { id: 'g-old', businessLineId: 'bl-paul', metric: 'CALLS', period: 'Month', target: 10, ambitiousTarget: null, startDate: '2026-09-01', endDate: '2026-09-30' },
    { id: 'g-unknown', businessLineId: 'bl-paul', metric: 'Taux de closing', period: 'Month', target: 30, ambitiousTarget: null, startDate: null, endDate: null },
  ]
  const data = {
    opportunities: [{ id: 'o1', businessLineId: 'bl-paul', createdAt: '2026-11-05T10:00:00' }],
    coldCallTargets: [{ id: 't1', businessLineId: 'bl-paul' }, { id: 't2', businessLineId: 'bl-kls3' }],
    activities: [
      { id: 'a1', type: 'CALL', result: 'NO_ANSWER', date: '2026-11-03T10:00:00', opportunityId: null, coldCallTargetId: 't1' },
      { id: 'a2', type: 'CALL', result: 'CONVERSATION', date: '2026-11-04T10:00:00', opportunityId: 'o1', coldCallTargetId: null },
      { id: 'a3', type: 'CALL', result: 'NO_ANSWER', date: '2026-11-04T11:00:00', opportunityId: null, coldCallTargetId: 't2' },
      { id: 'a4', type: 'CALL', result: 'NO_ANSWER', date: '2026-10-31T11:00:00', opportunityId: null, coldCallTargetId: 't1' },
      { id: 'a5', type: 'CALL', result: 'NO_ANSWER', date: '2026-11-04T11:00:00', opportunityId: null, coldCallTargetId: null },
    ],
    valueEvents: [
      { id: 'v1', businessLineId: 'bl-paul', eventType: 'PAID_MEETING', status: 'CONFIRMED', eventDate: '2026-11-10', amount: 100, revenueType: 'ONE_SHOT' },
      { id: 'v2', businessLineId: 'bl-paul', eventType: 'PAID_MEETING', status: 'PAID', eventDate: '2026-11-12', amount: 100, revenueType: 'ONE_SHOT' },
      { id: 'v3', businessLineId: 'bl-paul', eventType: 'PAID_MEETING', status: 'PENDING', eventDate: '2026-11-12', amount: 100, revenueType: 'ONE_SHOT' },
      { id: 'v4', businessLineId: 'bl-paul', eventType: 'PAID_MEETING', status: 'CANCELLED', eventDate: '2026-11-13', amount: 100, revenueType: 'ONE_SHOT' },
      { id: 'v5', businessLineId: 'bl-kls3', eventType: 'SIGNED_PROJECT', status: 'CONFIRMED', eventDate: '2026-11-20', amount: 12000, revenueType: 'PROJECT' },
    ],
  }
  const period = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 27, 23, 59, 59) }
  const rows = goalProgress.buildGoalProgress(goals, period, data, new Date(2026, 10, 15, 12))
  assert.equal(rows.map(row => row.goal.id).join(','), 'g-paul,g-calls,g-revenue,g-unknown')
  const [paul, calls, revenue, unknown] = rows
  assert.equal(paul.status, 'measured'); assert.equal(paul.actual, 2); assert.equal(paul.target, 8); assert.equal(paul.percent, 25)
  assert.equal(paul.window.start.getDate(), 1); assert.equal(paul.window.end.getDate(), 30)
  assert.ok(paul.expectedByNow > 3 && paul.expectedByNow < 4.5)
  assert.equal(calls.actual, 2)
  assert.equal(revenue.actual, 12000); assert.equal(revenue.unit, 'currency'); assert.equal(revenue.percent, 100)
  assert.equal(unknown.status, 'unknown_metric')
})
await test('Goals: a goal without dates or a known period is flagged, not measured', () => {
  const rows = goalProgress.buildGoalProgress(
    [{ id: 'g1', businessLineId: 'bl', metric: 'CALLS', period: 'Sprint', target: 5, ambitiousTarget: null, startDate: null, endDate: null }],
    { start: new Date(2026, 10, 1), end: new Date(2026, 10, 27) },
    { opportunities: [], coldCallTargets: [], activities: [], valueEvents: [] }
  )
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'unknown_period')
})
const csvLib = await load('lib/imports/csv.ts')
const importPlanner = await load('lib/imports/sales-os-import.ts', {}, { URL })
await test('CSV import: parses French CSV, detects duplicates in CRM and in file, never plans an Opportunity', () => {
  const csv = '﻿Entreprise;SIREN;Site web;Code postal;Secteur;Prénom;Nom;Email;Téléphone;Mobile;Colonne X\r\n' +
    '"Fonds ""Alpha""";123 456 789;alpha.fr;75008;;Anne;Durand;anne@alpha.fr;01 23 45 67 89;06 11 22 33 44;x\r\n' +
    'Beta Capital;;https://www.beta.fr;69002;Fonds d\'Investissement;Paul;Martin;paul@beta.fr;;;\n' +
    'Beta Capital SAS;;beta.fr;;;Julie;Roux;julie@gmail.com;;;\n' +
    'Gamma;;;;;Luc;Petit;luc@gamma.io;;;\n' +
    ';;;;;Sans;Entreprise;;;;\n' +
    'Delta;98765432100012;;;;Zoé;Blanc;zoe@delta.fr;;;\n'
  const table = csvLib.parseCsv(csv)
  assert.equal(table.rows.length, 6); assert.equal(table.rows[0].Entreprise, 'Fonds "Alpha"')
  const companies = [
    { id: 'cA', name: 'Alpha Gestion', registryNumber: '123456789', website: null, phone: null, email: null, postalCode: null },
    { id: 'cD', name: 'Delta', registryNumber: null, website: null, phone: null, email: null, postalCode: null },
  ]
  const contacts = [{ id: 'kZ', firstName: 'Zoé', lastName: 'Blanc', companyId: 'cD', email: 'zoe@delta.fr', phone: null }]
  const targets = [{ id: 't1', companyId: 'cD', contactId: 'kZ', businessLineId: 'FI', archived: false }]
  const plan = importPlanner.planImport({ rows: table.rows, headers: table.headers, companies, contacts, targets, businessLineId: 'FI', createTargets: true })
  const [alpha, beta, betaSas, gamma, missing, delta] = plan.rows
  assert.equal(alpha.company.state, 'EXISTING'); assert.equal(alpha.company.matchedBy, 'SIREN')
  assert.equal(alpha.data.phone, '01 23 45 67 89'); assert.match(alpha.data.notes, /Mobile : 06 11 22 33 44/)
  assert.equal(beta.company.state, 'CREATE'); assert.equal(beta.data.industry, "Fonds d'Investissement")
  assert.equal(betaSas.company.state, 'IN_FILE'); assert.equal(betaSas.company.matchedBy, 'domaine')
  assert.equal(betaSas.contact.state, 'CREATE', 'a personal gmail address never merges companies')
  assert.equal(gamma.target, 'CREATE')
  assert.equal(missing.errors.length, 1); assert.equal(missing.target, 'NONE')
  assert.equal(delta.company.state, 'EXISTING'); assert.equal(delta.contact.state, 'EXISTING'); assert.equal(delta.target, 'EXISTING')
  assert.equal(plan.unknownColumns.join(','), 'Colonne X')
  assert.equal(plan.summary.rejected, 1); assert.equal(plan.summary.companiesToCreate, 2); assert.equal(plan.summary.targetsToCreate, 4)
  assert.ok(!JSON.stringify(plan).toLowerCase().includes('opportunit'), 'the plan never mentions an Opportunity')
})
await test('CSV import: a contact belonging to another company gets no prospecting target', () => {
  const table = csvLib.parseCsv('Entreprise,Email,Prénom,Nom\nNouvelle SAS,zoe@delta.fr,Zoé,Blanc\n')
  const plan = importPlanner.planImport({ rows: table.rows, headers: table.headers, companies: [],
    contacts: [{ id: 'kZ', firstName: 'Zoé', lastName: 'Blanc', companyId: 'cD', email: 'zoe@delta.fr' }], targets: [], businessLineId: 'FI', createTargets: true })
  assert.equal(plan.rows[0].contact.state, 'EXISTING'); assert.equal(plan.rows[0].target, 'NONE')
  assert.match(plan.rows[0].warnings.join(' '), /autre entreprise/)
})
const callQueue = await load('lib/prospecting/call-queue.ts')
await test('call queue: explainable fixed order, follow-ups first, clicks only raise priority', () => {
  const now = new Date('2026-11-27T10:00:00Z')
  const t = (id, callStatus, extra = {}) => ({ id, companyId: `c-${id}`, contactId: `p-${id}`, businessLineId: 'bl', owner: 'Lilian', callStatus,
    opportunityId: null, archived: false, createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-11-01T09:00:00Z', ...extra })
  const targets = [
    t('never', 'À appeler'), t('old', 'Échange'), t('late', 'À rappeler'), t('today', 'À appeler'),
    t('later', 'À appeler'), t('click', 'À appeler'), t('callback', 'À rappeler'), t('wrong', 'Mauvais numéro'),
    t('converted', 'Qualifié', { opportunityId: 'opp' }), t('newer', 'À appeler', { createdAt: '2026-11-20T09:00:00Z' }),
  ]
  const task = (target, dueAt) => ({ id: `task-${target}`, coldCallTargetId: target, opportunityId: null, contactId: null, type: 'CALL', status: 'TODO', dueAt })
  const tasks = [task('late', '2026-11-24T09:00:00Z'), task('today', '2026-11-27T15:00:00Z'), task('later', '2026-12-02T09:00:00Z')]
  const call = (target, date) => ({ id: `a-${target}`, coldCallTargetId: target, type: 'CALL', date })
  const activities = [call('old', '2026-11-10T09:00:00Z'), call('callback', '2026-11-20T09:00:00Z')]
  const signals = [{ businessLineId: 'bl', companyId: 'c-click', contactId: 'p-click', priority: 'HIGH', state: 'AVAILABLE', reason: '1 clic(s) sur le CTA', lastSignalAt: '2026-11-26T08:00:00Z' }]
  const queue = callQueue.buildCallQueue({ targets, tasks, activities, signals, now })
  assert.equal(queue.map((item) => item.targetId).join(','), 'late,today,click,callback,never,newer,old')
  assert.equal(queue.map((item) => item.rule).join(','), 'OVERDUE_TASK,TASK_TODAY,CAMPAIGN_CLICK,CALLBACK_NO_DATE,NEVER_CALLED,NEVER_CALLED,OLDEST_CONTACT')
  assert.match(queue[0].reason, /3 jours de retard/)
  assert.match(queue[1].reason, /16:00/, 'times are shown in Paris time')
  assert.match(queue[6].reason, /il y a 17 jours/)
  assert.ok(queue.every((item) => item.reason), 'every prospect shows its reason')
  assert.equal(callQueue.buildCallQueue({ targets: [...targets].reverse(), tasks, activities, signals, now }).map((item) => item.targetId).join(','),
    queue.map((item) => item.targetId).join(','), 'order is reproducible')
  const calledAfterClick = callQueue.buildCallQueue({ targets: [targets[5]], tasks: [], activities: [call('click', '2026-11-26T12:00:00Z')], signals, now })
  assert.equal(calledAfterClick[0].rule, 'OLDEST_CONTACT', 'a click already followed by a call no longer jumps the queue')
})
const callSeries = await load('lib/prospecting/call-series.ts')
await test('Call series: follow-up only after results that keep the prospect open', () => {
  for (const result of ['NO_ANSWER', 'VOICEMAIL', 'CONVERSATION', 'CALLBACK', 'EMAIL_REQUESTED']) assert.equal(callSeries.needsFollowUp(result), true, result)
  for (const result of ['MEETING_BOOKED', 'NOT_INTERESTED', 'WRONG_NUMBER']) assert.equal(callSeries.needsFollowUp(result), false, result)
  assert.equal(callSeries.followUpTaskType('EMAIL_REQUESTED'), 'EMAIL')
  assert.equal(callSeries.followUpTaskType('CONVERSATION'), 'CALL')
})
await test('Call series: follow-up due dates skip the weekend', () => {
  const friday = new Date(2026, 10, 27, 15, 0)
  const tomorrow = new Date(callSeries.followUpDueAt('TOMORROW', friday))
  assert.equal(tomorrow.getDay(), 1); assert.equal(tomorrow.getDate(), 30); assert.equal(tomorrow.getHours(), 9); assert.equal(tomorrow.getMinutes(), 30)
  const inThree = new Date(callSeries.followUpDueAt('IN_3_DAYS', friday))
  assert.equal(inThree.getDate(), 30)
  const inSeven = new Date(callSeries.followUpDueAt('IN_7_DAYS', friday))
  assert.equal(inSeven.getMonth(), 11); assert.equal(inSeven.getDate(), 4)
})
await test('Call series: session summary counts calls, conversations, meetings and skips', () => {
  const summary = callSeries.summarizeSeries(['NO_ANSWER', 'CONVERSATION', 'MEETING_BOOKED', 'SKIPPED'], new Date(2026, 10, 27, 10, 0), new Date(2026, 10, 27, 10, 25))
  assert.equal(summary.calls, 3); assert.equal(summary.conversations, 2); assert.equal(summary.meetings, 1); assert.equal(summary.skipped, 1); assert.equal(summary.minutes, 25)
})
const briefing = await load('lib/prospecting/call-briefing.ts')
await test('Call briefing: merges target and contact history without duplicates', () => {
  const activities = [
    { id: 'a1', coldCallTargetId: 't1', contactId: 'c1', type: 'CALL', result: 'NO_ANSWER', notes: null, date: '2026-11-01T10:00:00Z' },
    { id: 'a2', coldCallTargetId: 't1', contactId: 'c1', type: 'CALL', result: 'CONVERSATION', notes: 'Rappeler après le budget', date: '2026-11-10T10:00:00Z' },
    { id: 'a3', coldCallTargetId: null, contactId: 'c1', type: 'EMAIL', result: 'EMAIL_SENT', notes: '', date: '2026-11-15T10:00:00Z' },
    { id: 'a4', coldCallTargetId: 't2', contactId: 'c9', type: 'CALL', result: 'CONVERSATION', notes: 'autre prospect', date: '2026-11-20T10:00:00Z' },
  ]
  const tasks = [
    { id: 'k1', coldCallTargetId: 't1', contactId: 'c1', status: 'TODO', dueAt: '2026-12-02T09:30:00Z', type: 'CALL', notes: 'Relance budget' },
    { id: 'k2', coldCallTargetId: 't1', contactId: 'c1', status: 'TODO', dueAt: '2026-12-10T09:30:00Z', type: 'CALL', notes: null },
    { id: 'k3', coldCallTargetId: 't1', contactId: 'c1', status: 'DONE', dueAt: '2026-11-01T09:30:00Z', type: 'CALL', notes: null },
  ]
  const result = briefing.buildCallBriefing({ targetId: 't1', contactId: 'c1', activities, tasks })
  assert.equal(result.calls, 2); assert.equal(result.emails, 1); assert.equal(result.linkedin, 0)
  assert.equal(result.lastExchange.id, 'a2'); assert.equal(result.lastNote.id, 'a2')
  assert.equal(result.recent.map(activity => activity.id).join(','), 'a3,a2,a1')
  assert.equal(result.openTask.id, 'k1')
})
await test('Call briefing: a prospect without history is a first contact', () => {
  const result = briefing.buildCallBriefing({ targetId: 't1', contactId: null, activities: [{ id: 'x', coldCallTargetId: null, contactId: null, type: 'CALL', result: null, notes: null, date: '2026-11-01T10:00:00Z' }], tasks: [] })
  assert.equal(result.calls, 0); assert.equal(result.recent.length, 0); assert.equal(result.openTask, null); assert.equal(result.lastExchange, null)
})
const senderLib = await load('lib/users/sender-identity.ts', {
  '@/lib/airtable': `export async function getUsers() { return globalThis.ownerState.users }`,
  '@/lib/digital-cards': `export async function getDigitalCardBySlug(slug) { return globalThis.ownerState.cards[slug] ?? null }`,
}, { globalThis: { ownerState } })
await test('sender identity comes from the digital card, then USERS, never from a coded first name', async () => {
  ownerState.users = [{ name: 'Camille', firstName: 'Camille', lastName: 'Martin', email: 'Camille@Example.test', active: true }]
  ownerState.cards = { eric: { displayName: 'Eric S.', firstName: 'Eric', lastName: 'S', email: 'eric@kls3.test', title: 'Directeur de missions' } }
  assert.deepEqual({ ...(await senderLib.getSenderIdentity('Eric')) }, { name: 'Eric S.', email: 'eric@kls3.test', title: 'Directeur de missions' })
  assert.deepEqual({ ...(await senderLib.getSenderIdentity('Camille')) }, { name: 'Camille Martin', email: 'camille@example.test', title: '' })
  assert.deepEqual({ ...(await senderLib.getSenderIdentity('Inconnu')) }, { name: 'Inconnu', email: '', title: '' })
})
const callStats = await load('lib/prospecting/call-stats.ts')
await test('calls today are counted for every owner, busiest first', () => {
  const calls = [{ owner: 'Lilian' }, { owner: 'Camille' }, { owner: 'Lilian' }, { owner: null }, { owner: 'Eric' }]
  assert.equal(callStats.callsByOwner(calls), 'Lilian 2 · Camille 1 · Eric 1')
  assert.equal(callStats.callsByOwner([]), '')
})
console.log(`${tests} CRM regression tests passed`)
