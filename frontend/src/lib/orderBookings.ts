import type { Order, Role, User } from '../types'

export interface BookingSummary {
  id: string; name: string; role?: Role; active?: boolean;
  total: number; pending: number; completed: number; cancelled: number
}

export function ordersByBooker(orders: Order[], users: User[]): BookingSummary[] {
  const people = new Map(users.map(user => [user.id, user]))
  const summaries = new Map<string, BookingSummary>()
  for (const user of users) {
    if (['admin', 'marketing'].includes(user.role)) summaries.set(user.id, {
      id: user.id, name: user.name, role: user.role, active: user.active,
      total: 0, pending: 0, completed: 0, cancelled: 0,
    })
  }
  for (const order of orders) {
    const id = order.createdBy || '__unrecorded__'
    if (!summaries.has(id)) {
      const user = people.get(id)
      summaries.set(id, {
        id, name: user?.name || order.createdByName || (order.createdBy ? 'Former staff member' : 'Booking user not recorded'),
        role: user?.role || order.createdByRole || undefined, active: user?.active,
        total: 0, pending: 0, completed: 0, cancelled: 0,
      })
    }
    const summary = summaries.get(id)!
    summary.total++
    if (order.status === 'active') summary.pending++
    else if (order.status === 'completed') summary.completed++
    else if (order.status === 'cancelled') summary.cancelled++
  }
  return [...summaries.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}
