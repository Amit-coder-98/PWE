import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire, Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { artworkAccess, canViewArtwork } from '../src/lib/artwork.ts'

// Render the actual TSX component without a browser or a live database.
// API calls and global notifications are stubbed; no requests leave this test.
const componentPath = fileURLToPath(new URL('../src/components/DesignWorkspace.tsx', import.meta.url))
const compiled = ts.transpileModule(readFileSync(componentPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const localRequire = createRequire(componentPath)
const componentModule = new Module(componentPath)
componentModule.require = (specifier) => {
  if (specifier === '../lib/api') return { api: {} }
  if (specifier === '../lib/artwork') return { artworkAccess, canViewArtwork }
  if (specifier === '../state/AppContext') return { toast() {} }
  if (specifier === './ConfirmDialog') return { ConfirmDialog: () => null }
  return localRequire(specifier)
}
componentModule._compile(compiled, componentPath)
const { DesignWorkspace } = componentModule.exports
const asset = { id: 'artwork', assetType: 'design', version: 1, fileName: 'approved.jpg', status: 'approved', uploadedByName: 'Marketing', createdAt: '2026-10-02T10:00:00Z' }
const order = { id: 'test-order', status: 'active', stages: { design: { status: 'ready' } }, designAssets: [asset] }
const render = (role, customOrder = order) => renderToStaticMarkup(createElement(DesignWorkspace, { role, order: customOrder, setOrder() {}, async reload() {} }))

for (const role of ['admin', 'marketing', 'designer']) {
  test(`${role} sees uploaded artwork and View image without approval buttons`, () => {
    const html = render(role)
    assert.match(html, /approved\.jpg/)
    assert.match(html, /View image/)
    assert.doesNotMatch(html, /Send for approval|Record staff-assisted response|Create approval link/)
    if (role === 'designer') assert.doesNotMatch(html, /type="file"|No customer image|Choose image/)
    else assert.match(html, /type="file"/)
  })
}

test('Designer cannot see payment proofs mixed into artwork', () => {
  const html = render('designer', { ...order, designAssets: [asset, { ...asset, id: 'proof', assetType: 'payment_proof', fileName: 'private-payment.png' }] })
  assert.match(html, /approved\.jpg/)
  assert.doesNotMatch(html, /private-payment/)
})

test('pending, rejected and deleted files cannot be viewed', () => {
  for (const status of ['pending', 'rejected', 'deleted']) {
    assert.equal(canViewArtwork({ ...asset, status }), false)
    assert.match(render('designer', { ...order, designAssets: [{ ...asset, status }] }), /disabled=""/)
  }
})

test('previously uploaded assets remain visible without a new approval step', () => {
  for (const status of ['available', 'in_review', 'approved', 'changes_requested']) {
    assert.equal(canViewArtwork({ ...asset, status }), true)
    const html = render('designer', { ...order, designAssets: [{ ...asset, status }] })
    assert.match(html, /View image/)
    assert.doesNotMatch(html, /disabled=""/)
  }
})

test('unrelated roles cannot render the private artwork panel', () => {
  for (const role of ['accountant', 'cutting_master', 'printing_operator', 'manager']) {
    assert.equal(render(role), '')
  }
})

test('No customer image remains available only when no usable artwork exists', () => {
  assert.doesNotMatch(render('admin'), /No customer image<\/button>/)
  assert.match(render('admin', { ...order, designAssets: [] }), /No customer image/)
  assert.doesNotMatch(render('designer', { ...order, designAssets: [] }), /<button/)
})
