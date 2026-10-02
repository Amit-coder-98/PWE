import assert from 'node:assert/strict'
import test from 'node:test'
import { stageKeys } from '../src/types.ts'
import { activeStages, actionableStage, currentWorkStage, focusedStage, nextInstruction, requestedTask } from '../src/lib/workflow.ts'
import { formatDate, formatDateTime } from '../src/lib/dateTime.ts'

function order(statuses = {}, currentStage = 'printing', status = 'active') {
  return { status, currentStage, stages: Object.fromEntries(stageKeys.map((key) => [key, { status: statuses[key] ?? 'waiting' }])) }
}

test('each department and legacy alias opens its own ready task despite an old Printing link', () => {
  for (const [role, stage] of Object.entries({ cutting_master: 'cutting', designer: 'design', transport_manager: 'plate', printing_operator: 'printing', manager: 'stitching', accountant: 'billing', marketing: 'delivery', inventory_manager: 'material', cutting_manager: 'cutting', plate_operator: 'plate', dispatch_manager: 'dispatch', stitching_manager: 'stitching', packing_manager: 'packing' })) {
    const item = order({ printing: 'completed', [stage]: 'ready' })
    assert.equal(actionableStage(item, role), stage)
    assert.equal(focusedStage(item, role), stage)
    assert.equal(requestedTask(item, role, 'printing'), stage)
    assert.equal(requestedTask(item, role, stage), stage)
  }
})

test('next consecutive task is selected after completion for multi-stage departments', () => {
  for (const [role, completed, next] of [['cutting_master', 'material', 'cutting'], ['manager', 'stitching', 'packing'], ['manager', 'packing', 'dc'], ['accountant', 'billing', 'payment'], ['transport_manager', 'plate', 'dispatch']]) {
    const item = order({ [completed]: 'completed', [next]: 'ready' }, completed)
    assert.equal(requestedTask(item, role, completed), next)
    assert.equal(focusedStage(item, role), next)
  }
})

test('parallel work does not focus the worker on another department', () => {
  const item = order({ cutting: 'ready', plate: 'ready' }, 'cutting')
  assert.equal(focusedStage(item, 'transport_manager'), 'plate')
  assert.equal(requestedTask(item, 'transport_manager', 'cutting'), 'plate')
  assert.equal(requestedTask(item, 'admin', 'cutting'), 'cutting')
})

test('workers without assigned work never automatically open someone else\'s drawer', () => {
  const item = order({ printing: 'ready' })
  assert.equal(requestedTask(item, 'manager', 'printing'), null)
  assert.equal(requestedTask(item, 'manager', '__proto__'), null)
  assert.equal(requestedTask(item, 'printing_operator', null), null)
  assert.match(nextInstruction(item, 'manager'), /No task is currently assigned/)
})

test('blocked and in-progress work stays assigned, completed work does not', () => {
  for (const status of ['ready', 'in_progress', 'blocked', 'issue']) {
    const item = order({ stitching: status })
    assert.equal(actionableStage(item, 'manager'), 'stitching')
  }
  assert.equal(actionableStage(order({ stitching: 'completed' }), 'manager'), null)
})

test('completed legacy Return records and cancelled orders have no pending tasks', () => {
  for (const status of ['completed', 'cancelled']) {
    const item = order({ delivery: 'completed', return: 'ready', billing: 'ready' }, 'return', status)
    assert.deepEqual(activeStages(item), [])
    assert.equal(actionableStage(item, 'marketing'), null)
    assert.equal(requestedTask(item, 'admin', 'return'), null)
    assert.match(nextInstruction(item), status === 'completed' ? /Delivered.*completed/ : /cancelled/)
  }
  assert.equal(currentWorkStage(order({ return: 'ready' }, 'return', 'completed')), 'delivery')
})

test('activity includes full date, year, seconds and IST across UTC midnight', () => {
  assert.equal(formatDateTime('2026-10-01T20:30:05Z'), '2 Oct 2026 · 2:00:05 am IST')
  assert.equal(formatDateTime('2026-10-02T10:00:00Z'), '2 Oct 2026 · 3:30:00 pm IST')
  assert.equal(formatDate('2026-10-02'), '2 Oct 2026')
  for (const value of [undefined, '', 'invalid']) {
    assert.equal(formatDateTime(value), 'Not recorded')
    assert.equal(formatDate(value), 'Not recorded')
  }
})
