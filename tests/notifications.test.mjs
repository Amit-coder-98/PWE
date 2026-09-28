import assert from 'node:assert/strict'
import test from 'node:test'
import { orderNotifications } from '../src/lib/workflow.ts'
import { stageKeys } from '../src/types.ts'

function order(id, statuses = {}, status = 'active', expectedDelivery = '2026-10-01') {
  return {
    id,
    orderNumber: `ORD-${id}`,
    customer: `Customer ${id}`,
    status,
    expectedDelivery,
    stages: Object.fromEntries(stageKeys.map((stage) => [stage, { status: statuses[stage] ?? 'waiting' }])),
  }
}

test('supervisors see issues, but not every routine pending task', () => {
  const orders = [
    order('1', { material: 'blocked', plate: 'ready', printing: 'issue' }),
    order('2', { material: 'blocked' }, 'completed'),
  ]
  assert.deepEqual(orderNotifications(orders, 'admin').map(({ stage }) => stage), ['material', 'printing'])
  assert.deepEqual(orderNotifications(orders, 'marketing').map(({ stage }) => stage), ['material', 'printing'])
})

test('workers only see their assigned pending work and problems', () => {
  const orders = [order('1', {
    material: 'blocked', cutting: 'ready', design: 'ready', plate: 'ready',
    printing: 'ready', stitching: 'ready', billing: 'ready', payment: 'ready',
    dispatch: 'ready', delivery: 'ready',
  })]
  assert.deepEqual(orderNotifications(orders, 'cutting_master').map(({ stage }) => stage), ['material', 'cutting'])
  assert.deepEqual(orderNotifications(orders, 'transport_manager').map(({ stage }) => stage), ['plate', 'dispatch'])
  assert.deepEqual(orderNotifications(orders, 'accountant').map(({ stage }) => stage), ['billing', 'payment'])
  assert.deepEqual(orderNotifications(orders, 'marketing').map(({ stage }) => stage), ['material', 'delivery'])
  assert.deepEqual(orderNotifications(orders, 'designer').map(({ stage }) => stage), ['design'])
})

test('issues appear before pending tasks, then earlier delivery dates', () => {
  const orders = [
    order('late', { design: 'ready' }, 'active', '2026-12-01'),
    order('early', { design: 'ready' }, 'active', '2026-10-01'),
    order('issue', { design: 'issue' }, 'active', '2026-11-01'),
  ]
  assert.deepEqual(orderNotifications(orders, 'designer').map(({ order: item }) => item.id), ['issue', 'early', 'late'])
})
