import assert from 'node:assert/strict'
import test from 'node:test'
import { bagTypes, bagTypeSuggestions, bagSpecification } from '../src/lib/bagTypes.ts'
import { apiErrorMessage } from '../src/lib/validationErrors.ts'

test('Catalogue contains exactly the nine client-provided bag types', () => {
  assert.deepEqual(bagTypes, ['D cut 65gsm', 'Stiching non woven', 'Roto bag', 'Metalic Bopp', 'Box bag machine made', 'Taffeta bag', 'Paper bag', 'Cottan bag', 'Other'])
  assert.deepEqual(bagTypeSuggestions('', []), bagTypes)
})
test('Most-booked types come first; ties retain catalogue order', () => {
  const orders = ['Paper bag', 'Roto bag', 'Paper bag', 'Paper bag', 'Roto bag', 'D cut 65gsm', 'Old custom type'].map(bagType => ({ bagType }))
  assert.deepEqual(bagTypeSuggestions('', orders).slice(0, 5), ['Paper bag', 'Roto bag', 'D cut 65gsm', 'Stiching non woven', 'Metalic Bopp'])
})
test('Letter-by-letter, multiple words, case and punctuation searches find the catalogue name', () => {
  for (const query of ['b', 'bo', 'box', 'box bag', 'box machine', 'BOX BAG MACHINE MADE']) assert.ok(bagTypeSuggestions(query, []).includes('Box bag machine made'))
  assert.deepEqual(bagTypeSuggestions('non woven', []), ['Stiching non woven'])
  assert.deepEqual(bagTypeSuggestions('d-cut 65', []), ['D cut 65gsm'])
  assert.deepEqual(bagTypeSuggestions('unlisted thing', []), [])
})
test('Common spelling variants find the exact client label without renaming it', () => {
  assert.deepEqual(bagTypeSuggestions('cotton', []), ['Cottan bag'])
  assert.deepEqual(bagTypeSuggestions('metallic', []), ['Metalic Bopp'])
  assert.deepEqual(bagTypeSuggestions('stitching', []), ['Stiching non woven'])
})
test('Only an existing edit value is added as a legacy choice; new orders stay fixed', () => {
  assert.deepEqual(bagTypeSuggestions('PP woven', [], 'PP woven bag'), ['PP woven bag'])
  assert.deepEqual(bagTypeSuggestions('PP woven', [{ bagType: 'PP woven bag' }]), [])
  assert.equal(bagTypeSuggestions('', [], 'Paper bag').length, 9)
})
test('GSM is numeric, bag color is trimmed and empty fields explicitly clear values', () => {
  const form = new FormData()
  form.set('gsm', '65.5')
  form.set('bagColor', '  Natural white  ')
  assert.deepEqual(bagSpecification(form), { gsm: 65.5, bagColor: 'Natural white' })
  form.set('gsm', '')
  form.set('bagColor', '  ')
  assert.deepEqual(bagSpecification(form), { gsm: null, bagColor: null })
  assert.deepEqual(bagSpecification(new FormData()), { gsm: null, bagColor: null })
})
test('Server validation errors name GSM and bag color clearly', () => {
  assert.equal(apiErrorMessage({ fields: [{ field: 'gsm', message: 'Must be positive.' }, { field: 'bagColor', message: 'Too long.' }] }), 'GSM: Must be positive.; Color of bag: Too long.')
})
