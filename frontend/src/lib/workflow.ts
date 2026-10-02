import type { Order, Role, StageKey, StageStatus } from '../types'

export const stageInfo: Record<StageKey, { label: string; short: string; role: Role; help: string }> = {
  order: { label: 'Order booked', short: 'Order', role: 'admin', help: 'Customer order is confirmed and ready for preparation.' },
  material: { label: 'Material available', short: 'Material', role: 'cutting_master', help: 'Check and reserve the required bag material.' },
  design: { label: 'Design preparation', short: 'Design', role: 'designer', help: 'View the customer-approved image uploaded by Marketing or Admin and complete artwork preparation.' },
  cutting: { label: 'Cutting', short: 'Cutting', role: 'cutting_master', help: 'Cut material to the required bag specification.' },
  plate: { label: 'Plate preparation', short: 'Plate', role: 'transport_manager', help: 'Prepare the printing plate from the approved design.' },
  printing: { label: 'Printing', short: 'Printing', role: 'printing_operator', help: 'Printing starts after cutting and plate preparation are complete.' },
  stitching: { label: 'Stitching', short: 'Stitching', role: 'manager', help: 'Stitch the printed pieces and update completed quantity.' },
  packing: { label: 'Packing', short: 'Packing', role: 'manager', help: 'Count, pack, weigh, and prepare boxes.' },
  dc: { label: 'Delivery challan', short: 'D.C.', role: 'manager', help: 'Generate the delivery challan for the packed order.' },
  billing: { label: 'Billing', short: 'Billing', role: 'accountant', help: 'Create and verify the customer invoice.' },
  payment: { label: 'Payment', short: 'Payment', role: 'accountant', help: 'Record payment received from the customer.' },
  dispatch: { label: 'Transport and dispatch', short: 'Transport', role: 'transport_manager', help: 'Arrange transport and record dispatch details.' },
  delivery: { label: 'Delivery confirmation', short: 'Delivery', role: 'marketing', help: 'Confirm that the customer received the order.' },
  return: { label: 'Return', short: 'Return', role: 'marketing', help: 'Record returned goods only when applicable.' },
  refund: { label: 'Refund', short: 'Refund', role: 'accountant', help: 'Record an approved refund only when applicable.' },
}

export const dependencies: Partial<Record<StageKey, StageKey[]>> = {
  material: ['order'], design: ['order'], cutting: ['material'], plate: ['design'],
  printing: ['material', 'cutting', 'design', 'plate'], stitching: ['printing'], packing: ['stitching'],
  dc: ['packing'], billing: ['dc'], payment: ['billing'], dispatch: ['billing'],
  delivery: ['payment', 'dispatch'], return: ['delivery'], refund: ['return'],
}

export const productionStages: StageKey[] = ['material', 'design', 'cutting', 'plate', 'printing', 'stitching', 'packing', 'dc', 'billing', 'payment', 'dispatch', 'delivery']

export function orderNotifications(orders: Order[], role: Role) {
  const supervisor = role === 'admin' || role === 'marketing'
  const assignedRole = operatingRole(role)
  return orders.flatMap((order) => {
    if (order.status !== 'active') return []
    return productionStages.flatMap((stage) => {
      const state = order.stages[stage]
      if (!state) return []
      const assigned = stageInfo[stage].role === assignedRole
      const problem = state.status === 'blocked' || state.status === 'issue'
      if ((!assigned && !supervisor) || (!problem && !(assigned && ['ready', 'in_progress'].includes(state.status)))) return []
      return [{ order, stage, state, problem }]
    })
  }).sort((a, b) => Number(b.problem) - Number(a.problem) || a.order.expectedDelivery.localeCompare(b.order.expectedDelivery))
}

export function isReady(order: Order, stage: StageKey) {
  return (dependencies[stage] ?? []).every((key) => order.stages[key].status === 'completed')
}

export function operatingRole(role: Role): Role {
  return ({ inventory_manager: 'cutting_master', cutting_manager: 'cutting_master', plate_operator: 'transport_manager', dispatch_manager: 'transport_manager', stitching_manager: 'manager', packing_manager: 'manager' } as Partial<Record<Role, Role>>)[role] ?? role
}

export function canManageStage(role: Role, stage: StageKey) {
  // Admin can supervise every order, but operational facts must be entered by
  // the department that performed the work (for example, stock by Material).
  return stageInfo[stage].role === operatingRole(role)
}

export function statusLabel(status: StageStatus) {
  return ({
    not_started: 'Not started', waiting: 'Waiting', ready: 'Pending', in_progress: 'Pending',
    completed: 'Completed', blocked: 'Blocked', issue: 'Issue reported', not_applicable: 'Not applicable',
  } satisfies Record<StageStatus, string>)[status]
}

export function activeStages(order: Order) {
  if (order.status !== 'active') return []
  return productionStages.filter((stage) => ['ready', 'in_progress', 'blocked', 'issue'].includes(order.stages[stage].status))
}

export function actionableStage(order: Order, role: Role): StageKey | null {
  return activeStages(order).find((stage) => canManageStage(role, stage)) ?? null
}

export function currentWorkStage(order: Order): StageKey {
  if (order.status === 'completed') return 'delivery'
  const active = activeStages(order)
  return active.includes(order.currentStage) ? order.currentStage : active[0] ?? 'delivery'
}

export function focusedStage(order: Order, role: Role): StageKey {
  return actionableStage(order, role) ?? currentWorkStage(order)
}

export function requestedTask(order: Order, role: Role, requested: string | null): StageKey | null {
  if (!requested || order.status !== 'active') return null
  const active = activeStages(order)
  const stage = active.find((key) => key === requested)
  const supervisor = role === 'admin' || role === 'marketing'
  if (stage && (canManageStage(role, stage) || supervisor)) return stage
  // Old bookmarks/notifications may name a completed task. Only open the
  // worker's next assigned task, never the previous department's drawer.
  return actionableStage(order, role)
}

export function nextInstruction(order: Order, role?: Role) {
  if (order.status === 'completed') return 'Delivered — this order is completed. No production task is pending.'
  if (order.status === 'cancelled') return 'This order is cancelled. No further production action is required.'
  const stage = role ? focusedStage(order, role) : currentWorkStage(order)
  const state = order.stages[stage]
  if (role && !actionableStage(order, role) && !['admin', 'marketing'].includes(role)) return 'No task is currently assigned to you. The next team is handling this order.'
  if (state.status === 'blocked' || state.status === 'issue') return `${stageInfo[stage].short} needs attention before production can continue.`
  return `${stageInfo[stage].short} is pending with the responsible team.`
}
