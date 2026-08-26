import type { Order, StageKey, User } from '../types'

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const tokenKey = 'pb-api-token'

export const apiEnabled = Boolean(apiBase)

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(tokenKey)
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail ?? 'The server could not complete this request. Please try again.')
  }
  return response.json() as Promise<T>
}

export async function apiLogin(email: string, password: string) {
  const result = await request<{ access_token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  localStorage.setItem(tokenKey, result.access_token)
  const orders = await request<Order[]>('/api/orders')
  return { user: result.user, orders }
}

export async function apiUpdateStage(order: Order, stage: StageKey, action: 'start' | 'complete' | 'progress' | 'resolve', quantity?: number) {
  return request<Order>(`/api/orders/${order.id}/stages/${stage}`, {
    method: 'POST',
    body: JSON.stringify({ action, completed_quantity: quantity, expected_version: order.version ?? 1 }),
  })
}

export function clearApiSession() { localStorage.removeItem(tokenKey) }
