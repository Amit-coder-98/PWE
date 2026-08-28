import { ArrowDown, GitMerge, Split } from 'lucide-react'
import { stageInfo } from '../lib/workflow'
import type { Order, StageKey } from '../types'
import { StatusBadge } from './StatusBadge'

function Node({ order, stageKey, onSelect }: { order: Order; stageKey: StageKey; onSelect: (stage: StageKey) => void }) {
  const state = order.stages[stageKey]
  return <button className="group min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-sky-400 hover:shadow-md" onClick={() => onSelect(stageKey)} aria-label={`Open ${stageInfo[stageKey].label}: ${state.status}`}>
    <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold text-navy-900">{stageInfo[stageKey].short}</span><span className="text-xs font-bold text-slate-400">View</span></div>
    <div className="mt-2"><StatusBadge status={state.status} /></div>
    <p className="mt-2 truncate text-xs text-slate-500">{stageInfo[stageKey].label}</p>
    {typeof state.progress === 'number' && state.status === 'in_progress' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${state.progress}%` }} /></div>}
  </button>
}

function Down() { return <div className="flex h-7 items-center justify-center text-slate-400" aria-hidden="true"><ArrowDown className="size-4" /></div> }

export function WorkflowMap({ order, onSelect }: { order: Order; onSelect: (stage: StageKey) => void }) {
  return <section className="surface p-4 md:p-6" aria-labelledby="workflow-title">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Complete order story</p><h2 id="workflow-title" className="mt-1 text-xl font-bold text-navy-900">Production workflow</h2><p className="mt-1 text-sm text-slate-600">Tap any step to see responsibility, progress, and available actions.</p></div><span className="rounded-lg bg-sky-soft px-3 py-2 text-xs font-semibold text-sky-800">Status uses words + icons</span></div>
    <div className="mx-auto max-w-3xl">
      <div className="mx-auto max-w-xs"><Node order={order} stageKey="order" onSelect={onSelect} /></div>
      <div className="flex h-9 items-center justify-center gap-2 text-xs font-bold text-slate-500"><Split className="size-4" />Two teams can work at the same time</div>
      <div className="grid grid-cols-2 gap-3 md:gap-5">
        <div><Node order={order} stageKey="material" onSelect={onSelect} /><Down /><Node order={order} stageKey="cutting" onSelect={onSelect} /></div>
        <div><Node order={order} stageKey="design" onSelect={onSelect} /><Down /><Node order={order} stageKey="plate" onSelect={onSelect} /></div>
      </div>
      <div className="flex h-11 items-center justify-center gap-2 text-xs font-bold text-slate-500"><GitMerge className="size-4" />Both branches must finish before Printing</div>
      <div className="mx-auto max-w-xs"><Node order={order} stageKey="printing" onSelect={onSelect} /><Down /><Node order={order} stageKey="stitching" onSelect={onSelect} /><Down /><Node order={order} stageKey="packing" onSelect={onSelect} /><Down /><Node order={order} stageKey="dc" onSelect={onSelect} /><Down /><Node order={order} stageKey="billing" onSelect={onSelect} /></div>
      <div className="flex h-9 items-center justify-center gap-2 text-xs font-bold text-slate-500"><Split className="size-4" />Accounts and dispatch preparation</div>
      <div className="grid grid-cols-2 gap-3 md:gap-5"><Node order={order} stageKey="payment" onSelect={onSelect} /><Node order={order} stageKey="dispatch" onSelect={onSelect} /></div>
      <div className="flex h-11 items-center justify-center gap-2 text-xs font-bold text-slate-500"><GitMerge className="size-4" />Payment and dispatch confirmed</div>
      <div className="mx-auto max-w-xs"><Node order={order} stageKey="delivery" onSelect={onSelect} /></div>
      {(order.stages.return.status !== 'not_applicable' || order.stages.refund.status !== 'not_applicable') && <><Down /><div className="grid grid-cols-2 gap-3 md:gap-5"><Node order={order} stageKey="return" onSelect={onSelect} /><Node order={order} stageKey="refund" onSelect={onSelect} /></div></>}
    </div>
  </section>
}
