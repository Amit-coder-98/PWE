import type { Order } from '../types'
import { productionStages, stageInfo } from './workflow'

export function orderProgress(order: Order) {
  const steps = ['order' as const, ...productionStages].map(stage => {
    const status = order.stages[stage]?.status ?? 'waiting'
    return { stage, label: stageInfo[stage].short, status, done: status === 'completed',
      pending: order.status === 'active' && ['ready', 'in_progress'].includes(status),
      issue: order.status === 'active' && ['blocked', 'issue'].includes(status) }
  })
  const done = steps.filter(step => step.done).length
  return { steps, done, total: steps.length, percent: Math.round(done / steps.length * 100) }
}
