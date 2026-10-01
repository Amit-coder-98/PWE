import assert from 'node:assert/strict'
import test from 'node:test'
import { orderTotal, remainingAmount, formatMoney } from '../src/lib/money.ts'
import { apiErrorMessage } from '../src/lib/validationErrors.ts'

test('reported rate 7.45 with 1200 bags and no advance totals 8940', () => {
  assert.equal(orderTotal(7.45, 1200), 8940)
  assert.equal(remainingAmount(8940, 0), 8940)
})

test('decimal totals and due amounts do not contain float artifacts', () => {
  assert.equal(orderTotal(0.29, 3), 0.87)
  assert.equal(remainingAmount(0.87, 0.10), 0.77)
  assert.equal(orderTotal(7.45, 3), 22.35)
  assert.equal(remainingAmount(22.35, 10.25), 12.10)
  assert.equal(remainingAmount(10, 11), 0)
})

test('currency display preserves paise and Indian grouping', () => {
  assert.equal(formatMoney(7.45), '₹7.45')
  assert.equal(formatMoney(8940), '₹8,940.00')
})

test('validation messages identify each actual invalid field', () => {
  assert.equal(apiErrorMessage({
    message: 'Please correct the highlighted information.',
    fields: [{ field: 'ratePerBag', message: 'Use two decimal places.' }, { field: 'alternativePhone', message: 'Too short.' }],
  }), 'Rate per bag: Use two decimal places.; Alternative phone: Too short.')
})

test('other server messages are preserved and unknown fields stay readable', () => {
  assert.equal(apiErrorMessage({ message: 'Advance exceeds total.' }), 'Advance exceeds total.')
  assert.equal(apiErrorMessage({ fields: [{ field: 'bagSize', message: 'Too long.' }] }), 'bag Size: Too long.')
  assert.ok(apiErrorMessage({}).length)
})
