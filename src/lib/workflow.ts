import type { Order, Role, StageKey, StageStatus } from '../types'

export const stageInfo: Record<StageKey, { label: string; short: string; role: Role; help: string }> = {
  order: { label: 'Order booked', short: 'Order', role: 'admin', help: 'Customer order is confirmed and ready for preparation.' },
  material: { label: 'Material available', short: 'Material', role: 'cutting_master', help: 'Check and reserve the required bag material.' },
  design: { label: 'Design approved', short: 'Design', role: 'designer', help: 'Prepare the artwork and receive approval.' },
  cutting: { label: 'Cutting', short: 'Cutting', role: 'cutting_master', help: 'Cut material to the required bag specification.' },
  plate: { label: 'Plate preparation', short: 'Plate', role: 'transport_manager', help: 'Prepare the printing plate from the approved design.' },
  printing: { label: 'Printing', short: 'Printing', role: 'printing_operator', help: 'Printing starts after cutting and plate preparation are complete.' },
  stitching: { label: 'Stitching', short: 'Stitching', role: 'manager', help: 'Stitch the printed pieces and update completed quantity.' },
  packing: { label: 'Packing', short: 'Packing', role: 'manager', help: 'Count, pack, weigh, and prepare boxes.' },
  dc: { label: 'Delivery challan', short: 'D.C.', role: 'manager', help: 'Generate the delivery challan for the packed order.' },
  billing: { label: 'Billing', short: 'Billing', role: 'accountant', help: 'Create and verify the customer invoice.' },
  payment: { label: 'Payment', short: 'Payment', role: 'accountant', help: 'Record payment received from the customer.' },
  dispatch: { label: 'Dispatch', short: 'Dispatch', role: 'transport_manager', help: 'Record transporter and tracking information.' },
  delivery: { label: 'Delivery confirmation', short: 'Delivery', role: 'marketing', help: 'Confirm that the customer received the order.' },
  return: { label: 'Return', short: 'Return', role: 'marketing', help: 'Record returned goods only when applicable.' },
  refund: { label: 'Refund', short: 'Refund', role: 'accountant', help: 'Record an approved refund only when applicable.' },
}

export const dependencies: Partial<Record<StageKey, StageKey[]>> = {
  material: ['order'], design: ['order'], cutting: ['order'], plate: ['order'],
  printing: ['material', 'cutting', 'design', 'plate'], stitching: ['printing'], packing: ['stitching'],
  dc: ['packing'], billing: ['dc'], payment: ['billing'], dispatch: ['billing'],
  delivery: ['payment', 'dispatch'], return: ['delivery'], refund: ['return'],
}

export const productionStages: StageKey[] = ['material', 'design', 'cutting', 'plate', 'printing', 'stitching', 'packing', 'dc', 'billing', 'payment', 'dispatch', 'delivery']

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
    not_started: 'Not started', waiting: 'Waiting', ready: 'Ready to start', in_progress: 'In progress',
    completed: 'Completed', blocked: 'Blocked', issue: 'Issue reported', not_applicable: 'Not applicable',
  } satisfies Record<StageStatus, string>)[status]
}

export function nextInstruction(order: Order) {
  const stage = order.currentStage
  const state = order.stages[stage]
  if (state.status === 'blocked' || state.status === 'issue') return `Resolve the ${stageInfo[stage].short.toLowerCase()} issue before production can continue.`
  if (state.status === 'in_progress') return `Continue ${stageInfo[stage].short.toLowerCase()} and update the completed quantity.`
  return `The order is ready for ${stageInfo[stage].short.toLowerCase()}. The responsible team can start now.`
}
