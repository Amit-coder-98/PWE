import type { Activity, Order, StageKey, StageState, User } from '../types'
import { deriveOrder, stageInfo } from '../lib/workflow'

export const demoUsers: User[] = [
  ['u1', 'System Administrator', 'admin@demo.com', 'admin', 'Administration', 'SA'],
  ['u2', 'Neha Patil', 'order@demo.com', 'order_manager', 'Order & CRM', 'NP'],
  ['u3', 'Vijay More', 'inventory@demo.com', 'inventory_manager', 'Material & Inventory', 'VM'],
  ['u4', 'Pooja Shinde', 'designer@demo.com', 'designer', 'Design', 'PS'],
  ['u5', 'Ganesh Kale', 'cutting@demo.com', 'cutting_manager', 'Cutting', 'GK'],
  ['u6', 'Rohit Jadhav', 'plate@demo.com', 'plate_operator', 'Plate / Prepress', 'RJ'],
  ['u7', 'Sanjay Pawar', 'printing@demo.com', 'printing_operator', 'Printing', 'SP'],
  ['u8', 'Meena Deshmukh', 'stitching@demo.com', 'stitching_manager', 'Stitching', 'MD'],
  ['u9', 'Asha Gaikwad', 'packing@demo.com', 'packing_manager', 'Packing & D.C.', 'AG'],
  ['u10', 'Rakesh Joshi', 'accountant@demo.com', 'accountant', 'Accounts', 'RJ'],
  ['u11', 'Imran Shaikh', 'dispatch@demo.com', 'dispatch_manager', 'Dispatch & Delivery', 'IS'],
].map(([id, name, email, role, department, initials]) => ({ id, name, email, role, department, initials, password: 'admin123' } as User))

const owners: Record<StageKey, string> = {
  order: 'Neha Patil', material: 'Vijay More', design: 'Pooja Shinde', cutting: 'Ganesh Kale', plate: 'Rohit Jadhav',
  printing: 'Sanjay Pawar', stitching: 'Meena Deshmukh', packing: 'Asha Gaikwad', dc: 'Asha Gaikwad',
  billing: 'Rakesh Joshi', payment: 'Rakesh Joshi', dispatch: 'Imran Shaikh', delivery: 'Imran Shaikh',
  return: 'Imran Shaikh', refund: 'Rakesh Joshi',
}

function stage(status: StageState['status'], key: StageKey, extra: Partial<StageState> = {}): StageState {
  return { status, owner: owners[key], ...extra }
}

function stagesUntil(current: StageKey, currentStatus: StageState['status'] = 'in_progress', quantity = 500) {
  const sequence: StageKey[] = ['order', 'material', 'design', 'cutting', 'plate', 'printing', 'stitching', 'packing', 'dc', 'billing', 'payment', 'dispatch', 'delivery']
  const currentIndex = sequence.indexOf(current)
  const result = {} as Record<StageKey, StageState>
  for (const key of sequence) {
    const index = sequence.indexOf(key)
    result[key] = index < currentIndex
      ? stage('completed', key, { completedAt: `2026-08-${String(20 + Math.min(index, 5)).padStart(2, '0')}T10:30:00`, progress: 100, completedQuantity: quantity })
      : index === currentIndex ? stage(currentStatus, key, { progress: currentStatus === 'completed' ? 100 : 45, completedQuantity: Math.round(quantity * .45), startedAt: '2026-08-24T10:20:00' })
      : stage('waiting', key)
  }
  result.return = stage('not_applicable', 'return')
  result.refund = stage('not_applicable', 'refund')
  return result
}

function activity(actor: string, message: string, stageKey: StageKey, at: string): Activity {
  return { id: `${stageKey}-${at}`, actor, message, stage: stageKey, at }
}

function makeOrder(input: Partial<Order> & Pick<Order, 'id' | 'orderNumber' | 'customer' | 'product' | 'quantity' | 'amount' | 'currentStage'>): Order {
  const base: Order = {
    contactPerson: 'Purchasing Manager', phone: '+91 90000 00000', orderDate: '2026-08-20', expectedDelivery: '2026-08-30',
    priority: 'normal', activity: [], stages: stagesUntil(input.currentStage, 'in_progress', input.quantity), ...input,
  }
  return deriveOrder(base)
}

const heroStages = stagesUntil('stitching', 'in_progress', 500)
heroStages.stitching = stage('in_progress', 'stitching', { progress: 64, completedQuantity: 320, startedAt: '2026-08-24T10:20:00', note: '320 of 500 bags stitched' })

export const demoOrders: Order[] = [
  makeOrder({ id: 'o125', orderNumber: 'ORD-2026-00125', customer: 'Shree Ganesh Agro', contactPerson: 'Amit Kulkarni', phone: '+91 98220 14567', product: 'Custom Printed Woven Bags', quantity: 500, amount: 245000, currentStage: 'stitching', priority: 'urgent', expectedDelivery: '2026-08-28', stages: heroStages, activity: [
    activity('Meena Deshmukh', 'Updated stitching: 320 of 500 bags completed.', 'stitching', '2026-08-24T14:20:00'),
    activity('Sanjay Pawar', 'Marked printing completed.', 'printing', '2026-08-24T11:10:00'),
    activity('Rohit Jadhav', 'Marked plate preparation completed.', 'plate', '2026-08-23T17:20:00'),
    activity('Pooja Shinde', 'Customer approved design version 2.', 'design', '2026-08-23T15:40:00'),
    activity('Vijay More', 'Confirmed and reserved material.', 'material', '2026-08-22T11:20:00'),
  ] }),
  makeOrder({ id: 'o124', orderNumber: 'ORD-2026-00124', customer: 'Sai Seeds Pvt. Ltd.', product: 'Laminated Seed Bags', quantity: 1000, amount: 380000, currentStage: 'printing', priority: 'high', expectedDelivery: '2026-08-29' }),
  makeOrder({ id: 'o123', orderNumber: 'ORD-2026-00123', customer: 'Pragati Fertilizers', product: 'Fertilizer Packaging Bags', quantity: 750, amount: 312000, currentStage: 'design', expectedDelivery: '2026-09-03' }),
  makeOrder({ id: 'o122', orderNumber: 'ORD-2026-00122', customer: 'Mahalaxmi Foods', product: 'Rice Packaging Bags', quantity: 800, amount: 296000, currentStage: 'packing', expectedDelivery: '2026-08-27', priority: 'high' }),
  makeOrder({ id: 'o121', orderNumber: 'ORD-2026-00121', customer: 'Krishna Dairy', product: 'Cattle Feed Bags', quantity: 400, amount: 168000, currentStage: 'billing', expectedDelivery: '2026-08-31' }),
  makeOrder({ id: 'o120', orderNumber: 'ORD-2026-00120', customer: 'Sahyadri Organics', product: 'Organic Produce Bags', quantity: 650, amount: 227500, currentStage: 'dispatch', priority: 'high', expectedDelivery: '2026-08-27' }),
  makeOrder({ id: 'o119', orderNumber: 'ORD-2026-00119', customer: 'Green Field Farms', product: 'Vegetable Mesh Bags', quantity: 300, amount: 99000, currentStage: 'delivery', stages: stagesUntil('delivery', 'completed', 300), expectedDelivery: '2026-08-25' }),
  makeOrder({ id: 'o118', orderNumber: 'ORD-2026-00118', customer: 'Annapurna Traders', product: 'Flour Packaging Bags', quantity: 200, amount: 74000, currentStage: 'return', expectedDelivery: '2026-08-24', stages: { ...stagesUntil('delivery', 'completed', 200), return: stage('in_progress', 'return', { note: '12 damaged bags reported by customer' }), refund: stage('waiting', 'refund') } }),
]

demoOrders[2].stages.design = stage('blocked', 'design', { note: 'Waiting for customer approval of artwork.' })
demoOrders[1].stages.printing.note = 'Machine 2 assigned'
demoOrders.forEach((order) => Object.values(order.stages).forEach((state, index) => { if (!state.owner) state.owner = stageInfo[Object.keys(order.stages)[index] as StageKey].label }))
