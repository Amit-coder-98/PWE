import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire, Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { ordersByBooker } from '../src/lib/orderBookings.ts'
import * as workflow from '../src/lib/workflow.ts'
import { canViewArtwork } from '../src/lib/artwork.ts'
import { formatDateTime } from '../src/lib/dateTime.ts'

function load(relativePath, stubs = {}) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url))
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const localRequire = createRequire(path)
  const mod = new Module(path)
  mod.require = specifier => specifier in stubs ? stubs[specifier] : localRequire(specifier)
  mod._compile(compiled, path)
  return mod.exports
}
const { orderProgress } = load('../src/lib/orderProgress.ts', { './workflow': workflow })
const { OrderProgress } = load('../src/components/OrderProgress.tsx', {
  '../lib/orderProgress': { orderProgress }, '../lib/workflow': workflow,
})
const { PaymentProofWorkspace } = load('../src/components/PaymentProofWorkspace.tsx', {
  '../lib/api': { api: {} }, '../lib/artwork': { canViewArtwork },
  '../lib/dateTime': { formatDateTime }, '../state/AppContext': { toast() {} },
})
const stages = () => Object.fromEntries(['order', ...workflow.productionStages].map(key => [key, { status: key === 'order' ? 'completed' : 'waiting' }]))
const order = () => ({ id: 'sample', status: 'active', stages: stages() })
const user = (id, name, role = 'marketing') => ({ id, name, role, active: true })
const booking = (createdBy, status = 'active', extra = {}) => ({ createdBy, status, ...extra })

test('Admin sees separate 3/2/3 bookings, five Marketing users and zero-count people', () => {
  const users = [user('m1', 'Ganesh Kalekar'), user('m2', 'Marketing Two'), user('m3', 'Marketing Three'), user('m4', 'Marketing Four'), user('m5', 'Marketing Five'), user('a', 'Administrator', 'admin')]
  const orders = [booking('m1'), booking('m1', 'completed'), booking('m1', 'cancelled'), booking('m2'), booking('m2'), booking('a'), booking('a'), booking('a')]
  const result = ordersByBooker(orders, users)
  assert.equal(result.length, 6)
  assert.equal(result.find(p => p.id === 'm1').total, 3)
  assert.equal(result.find(p => p.id === 'm2').total, 2)
  assert.equal(result.find(p => p.id === 'a').total, 3)
  assert.equal(result.find(p => p.id === 'm3').total, 0)
  assert.deepEqual([result.find(p => p.id === 'm1').pending, result.find(p => p.id === 'm1').completed, result.find(p => p.id === 'm1').cancelled], [1, 1, 1])
})

test('Duplicate names stay separate and renaming or deactivating retains booking identity', () => {
  const users = [user('one', 'Ganesh'), { ...user('two', 'Ganesh'), active: false }]
  const orders = [booking('one', 'active', { createdByName: 'Old Name' }), booking('two')]
  const result = ordersByBooker(orders, users)
  assert.equal(result.length, 2)
  assert.equal(result.find(p => p.id === 'one').name, 'Ganesh')
  assert.equal(result.find(p => p.id === 'two').active, false)
  assert.equal(result.find(p => p.id === 'two').total, 1)
})

test('Former staff use snapshots and missing legacy identities are not falsely attributed', () => {
  const result = ordersByBooker([booking('old', 'completed', { createdByName: 'Former Marketing', createdByRole: 'marketing' }), booking('deleted'), booking(null), booking(undefined)], [])
  assert.equal(result.find(p => p.id === 'old').name, 'Former Marketing')
  assert.equal(result.find(p => p.id === 'deleted').name, 'Former staff member')
  assert.equal(result.find(p => p.id === '__unrecorded__').total, 2)
})

test('Progress reflects real parallel steps, not a fabricated consecutive range', () => {
  const item = order()
  item.stages.material.status = 'ready'
  item.stages.design.status = 'completed'
  item.stages.plate.status = 'completed'
  const result = orderProgress(item)
  assert.equal(result.done, 3)
  assert.equal(result.total, 13)
  assert.equal(result.percent, 23)
  assert.equal(result.steps.find(p => p.stage === 'material').pending, true)
  assert.equal(result.steps.find(p => p.stage === 'cutting').done, false)
  assert.equal(result.steps.find(p => p.stage === 'plate').done, true)
})

test('Completed journey is 100%, excludes Return/Refund, and cancelled orders have no pending work', () => {
  const item = order()
  for (const state of Object.values(item.stages)) state.status = 'completed'
  item.status = 'completed'
  item.stages.return = { status: 'ready' }
  assert.equal(orderProgress(item).percent, 100)
  assert.equal(orderProgress(item).steps.some(p => p.stage === 'return' || p.stage === 'refund'), false)
  item.status = 'cancelled'
  item.stages.material.status = 'ready'
  item.stages.design.status = 'blocked'
  assert.equal(orderProgress(item).steps.some(p => p.pending || p.issue), false)
})

test('Actual progress components render green completed, blue pending, red blocked and scrollable stations', () => {
  const item = order()
  item.stages.material.status = 'ready'
  item.stages.design.status = 'blocked'
  const html = renderToStaticMarkup(createElement(OrderProgress, { order: item }))
  assert.match(html, /Order booked/)
  assert.match(html, /Delivery/)
  assert.match(html, /overflow-x-auto/)
  assert.match(html, /bg-emerald-500/)
  assert.match(html, /border-sky-500/)
  assert.match(html, /border-red-500/)
  assert.doesNotMatch(html, /Return|Refund/)
  const compact = renderToStaticMarkup(createElement(OrderProgress, { order: item, compact: true }))
  assert.match(compact, /role="progressbar"/)
  assert.match(compact, /aria-valuemax="13" aria-valuenow="1"/)
})

const proof = { id: 'proof', assetType: 'payment_proof', fileName: 'advance-receipt.png', status: 'available', uploadedByName: 'Ganesh Kalekar', createdAt: '2026-10-04T10:00:00Z' }
const renderProof = (role, proofs = [proof]) => renderToStaticMarkup(createElement(PaymentProofWorkspace, { role, order: { ...order(), paymentProofs: proofs } }))
for (const role of ['admin', 'marketing', 'accountant']) {
  test(`${role} sees a separate private payment proof View option with uploader/date`, () => {
    const html = renderProof(role)
    assert.match(html, /advance-receipt\.png/)
    assert.match(html, /View payment proof/)
    assert.match(html, /Ganesh Kalekar/)
    assert.match(html, /4 Oct 2026/)
    assert.doesNotMatch(html, /disabled=""/)
  })
}
test('Payment proof panel is absent for production roles and cannot leak artwork', () => {
  for (const role of ['designer', 'cutting_master', 'transport_manager', 'printing_operator', 'manager']) assert.equal(renderProof(role), '')
  assert.doesNotMatch(renderProof('admin', [{ ...proof, assetType: 'design', fileName: 'artwork.jpg' }]), /artwork.jpg/)
})
test('Unverified/deleted payment proof View is disabled; an empty order has an accurate message', () => {
  for (const status of ['pending', 'rejected', 'deleted']) assert.match(renderProof('admin', [{ ...proof, status }]), /disabled=""/)
  assert.match(renderProof('admin', []), /No advance payment screenshot was uploaded/)
})
