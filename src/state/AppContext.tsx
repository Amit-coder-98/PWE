import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { demoOrders, demoUsers } from '../data/demo'
import { apiEnabled, apiLogin, apiUpdateStage, clearApiSession } from '../lib/api'
import { deriveOrder } from '../lib/workflow'
import type { AppData, Order, StageKey, User } from '../types'

const STORAGE_KEY = 'pb-production-v1'

interface AppContextValue extends AppData {
  users: User[]
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
  resetDemo: () => void
  updateStage: (orderId: string, stage: StageKey, action: 'start' | 'complete' | 'progress' | 'resolve', quantity?: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)
const notify = (message: string, kind: 'success' | 'error' = 'success') => window.dispatchEvent(new CustomEvent('pb-toast', { detail: { message, kind } }))

function loadInitial(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as AppData
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return { orders: structuredClone(demoOrders), currentUser: null }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadInitial)

  const save = (next: AppData) => {
    setData(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const value = useMemo<AppContextValue>(() => ({
    ...data,
    users: demoUsers,
    async login(email, password) {
      if (apiEnabled) {
        try {
          const result = await apiLogin(email, password)
          save({ orders: result.orders, currentUser: result.user })
          return null
        } catch (error) {
          return error instanceof Error ? error.message : 'Unable to connect to the server. Please try again.'
        }
      }
      const user = demoUsers.find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password)
      if (!user) return 'Email or password is incorrect. Please use one of the demo accounts shown below.'
      save({ ...data, currentUser: user })
      return null
    },
    logout() { clearApiSession(); save({ ...data, currentUser: null }) },
    resetDemo() { save({ orders: structuredClone(demoOrders), currentUser: data.currentUser }) },
    updateStage(orderId, stageKey, action, quantity) {
      if (apiEnabled) {
        const order = data.orders.find((item) => item.id === orderId)
        if (order) void apiUpdateStage(order, stageKey, action, quantity).then((updated) => {
          save({ ...data, orders: data.orders.map((item) => item.id === updated.id ? updated : item) })
          notify('Order updated successfully. The next team can now see the latest status.')
        }).catch((error: unknown) => notify(error instanceof Error ? error.message : 'The order could not be updated. Please try again.', 'error'))
        return
      }
      const orders = data.orders.map((source): Order => {
        if (source.id !== orderId) return source
        const order = structuredClone(source)
        const stage = order.stages[stageKey]
        const now = new Date().toISOString()
        let message = ''
        if (action === 'start') {
          stage.status = 'in_progress'
          stage.startedAt = now
          stage.progress = stage.progress ?? 0
          message = `Started ${stageKey}.`
        }
        if (action === 'progress' && quantity !== undefined) {
          const safeQuantity = Math.max(0, Math.min(order.quantity, quantity))
          stage.status = 'in_progress'
          stage.completedQuantity = safeQuantity
          stage.progress = Math.round((safeQuantity / order.quantity) * 100)
          message = `Updated ${stageKey}: ${safeQuantity} of ${order.quantity} completed.`
        }
        if (action === 'resolve') {
          stage.status = 'ready'
          stage.note = 'Issue resolved. Work can continue.'
          message = `Resolved the ${stageKey} issue.`
        }
        if (action === 'complete') {
          stage.status = 'completed'
          stage.completedAt = now
          stage.progress = 100
          stage.completedQuantity = order.quantity
          message = `Marked ${stageKey} completed.`
        }
        order.activity.unshift({ id: crypto.randomUUID(), at: now, actor: data.currentUser?.name ?? 'Demo user', message, stage: stageKey })
        return deriveOrder(order)
      })
      save({ ...data, orders })
      notify('Order updated successfully. The next team can now see the latest status.')
    },
  }), [data])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
