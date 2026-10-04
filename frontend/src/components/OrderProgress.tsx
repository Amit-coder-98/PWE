import { Check, AlertTriangle } from 'lucide-react'
import type { Order } from '../types'
import { orderProgress } from '../lib/orderProgress'
import { statusLabel } from '../lib/workflow'

export function OrderProgress({ order, compact = false }: { order: Order; compact?: boolean }) {
  const { steps, done, total, percent } = orderProgress(order)
  return (
    <div className={compact ? 'mt-3' : 'surface mt-4 p-4 sm:p-5'} aria-label={`Order progress: ${done} of ${total} steps completed`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`${compact ? 'text-xs' : 'font-bold'} text-navy-900`}>Order progress{order.status === 'cancelled' && ' · Cancelled'}</p>
        <p className="text-xs font-semibold tabular-nums text-emerald-700">{done}/{total} completed · {percent}%</p>
      </div>
      {compact ? (
        <div className="mt-2 flex gap-0.5" role="progressbar" aria-label="Completed production steps" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          {steps.map(step => <span key={step.stage} title={`${step.label}: ${statusLabel(step.status)}`} className={`h-2 min-w-0 flex-1 rounded-sm ${step.done ? 'bg-emerald-500' : step.issue ? 'bg-red-500' : step.pending ? 'bg-sky-400' : 'bg-slate-200'}`} />)}
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-500">Green: completed · Blue: pending · Red: needs attention. Scroll to see every step.</p>
          <div className="filter-scroll mt-4 max-w-full overflow-x-auto pb-3" tabIndex={0} aria-label="Production journey from order booking to delivery">
            <ol className="grid min-w-[64rem]" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
              {steps.map((step, index) => (
                <li className="relative min-w-0 px-1 text-center" key={step.stage} aria-current={step.pending ? 'step' : undefined}>
                  {index < total - 1 && <span aria-hidden="true" className={`absolute left-1/2 top-[15px] h-1 w-full ${step.done && steps[index + 1].done ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                  <span className={`relative z-10 mx-auto grid size-8 place-items-center rounded-full border-2 text-xs font-bold ${step.done ? 'border-emerald-500 bg-emerald-500 text-white' : step.issue ? 'border-red-500 bg-red-50 text-red-700' : step.pending ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                    {step.done ? <Check className="size-4" aria-hidden="true" /> : step.issue ? <AlertTriangle className="size-4" aria-hidden="true" /> : index + 1}
                  </span>
                  <p className="mt-2 break-words text-xs font-bold text-navy-900">{step.stage === 'order' ? 'Order booked' : step.stage === 'material' ? 'Material available' : step.label}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{statusLabel(step.status)}</p>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  )
}
