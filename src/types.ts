export const roles = [
  'admin', 'order_manager', 'inventory_manager', 'designer', 'cutting_manager',
  'plate_operator', 'printing_operator', 'stitching_manager', 'packing_manager',
  'accountant', 'dispatch_manager',
] as const

export type Role = typeof roles[number]

export const stageKeys = [
  'order', 'material', 'design', 'cutting', 'plate', 'printing', 'stitching',
  'packing', 'dc', 'billing', 'payment', 'dispatch', 'delivery', 'return', 'refund',
] as const

export type StageKey = typeof stageKeys[number]
export type StageStatus = 'not_started' | 'waiting' | 'ready' | 'in_progress' | 'completed' | 'blocked' | 'issue' | 'not_applicable'
export type Priority = 'normal' | 'high' | 'urgent'

export interface User {
  id: string
  name: string
  email: string
  password?: string
  role: Role
  department: string
  initials: string
}

export interface StageState {
  status: StageStatus
  owner: string
  progress?: number
  completedQuantity?: number
  startedAt?: string
  completedAt?: string
  note?: string
}

export interface Activity {
  id: string
  at: string
  actor: string
  message: string
  stage: StageKey
}

export interface Order {
  id: string
  orderNumber: string
  customer: string
  contactPerson: string
  phone: string
  product: string
  quantity: number
  amount: number
  orderDate: string
  expectedDelivery: string
  priority: Priority
  currentStage: StageKey
  stages: Record<StageKey, StageState>
  activity: Activity[]
  version?: number
}

export interface AppData {
  orders: Order[]
  currentUser: User | null
}
