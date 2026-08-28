export const roles = ['admin', 'order_manager', 'inventory_manager', 'designer', 'cutting_manager', 'plate_operator', 'printing_operator', 'stitching_manager', 'packing_manager', 'accountant', 'dispatch_manager'] as const
export type Role = typeof roles[number]
export const stageKeys = ['order', 'material', 'design', 'cutting', 'plate', 'printing', 'stitching', 'packing', 'dc', 'billing', 'payment', 'dispatch', 'delivery', 'return', 'refund'] as const
export type StageKey = typeof stageKeys[number]
export type StageStatus = 'not_started' | 'waiting' | 'ready' | 'in_progress' | 'completed' | 'blocked' | 'issue' | 'not_applicable'
export type Priority = 'normal' | 'high' | 'urgent'

export interface User {
  id: string; name: string; email: string; role: Role; department: string; initials: string; active: boolean; mustChangePassword: boolean
}
export interface Customer {
  id: string; companyName: string; contactPerson: string; phone: string; email?: string; address: string; active: boolean; createdAt: string; updatedAt: string
}
export interface StageState {
  status: StageStatus; ownerRole: Role; progress?: number; completedQuantity?: number; startedAt?: string; completedAt?: string; note?: string; data?: Record<string, unknown>; noCustomerImage?: boolean
}
export interface AuditEvent {
  id: string; orderId: string; actorName: string; actorRole: string; stage: StageKey; message: string; details: Record<string, unknown>; at: string
}
export interface DesignAsset {
  id: string; orderId: string; version: number; fileName: string; contentType: string; size?: number; expectedSize: number; width?: number; height?: number; status: 'pending' | 'available' | 'in_review' | 'approved' | 'changes_requested' | 'rejected' | 'deleted'; uploadedByName: string; createdAt: string; decisionReason?: string
}
export interface Order {
  id: string; orderNumber: string; customerId: string; customer: string; contactPerson: string; phone: string; product: string; quantity: number; amount: number; orderDate: string; expectedDelivery: string; priority: Priority; currentStage: StageKey; stages: Record<StageKey, StageState>; version: number; status: string; notes?: string; createdAt: string; updatedAt: string; closedAt?: string; activity?: AuditEvent[]; designAssets?: DesignAsset[]
}
export interface ApiErrorBody { code: string; message: string; requestId?: string; fields?: Array<{ field: string; message: string }> }
