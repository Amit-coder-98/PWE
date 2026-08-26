import { AlertTriangle, CheckCircle2, Circle, Clock3, PauseCircle, PlayCircle } from 'lucide-react'
import { statusLabel } from '../lib/workflow'
import type { StageStatus } from '../types'

const styles: Record<StageStatus, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  ready: 'bg-sky-50 text-sky-700 border-sky-200',
  waiting: 'bg-amber-50 text-amber-800 border-amber-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  issue: 'bg-red-50 text-red-700 border-red-200',
  not_started: 'bg-slate-50 text-slate-600 border-slate-200',
  not_applicable: 'bg-slate-50 text-slate-500 border-slate-200',
}

const icons = {
  completed: CheckCircle2, in_progress: PlayCircle, ready: Circle, waiting: Clock3,
  blocked: AlertTriangle, issue: AlertTriangle, not_started: PauseCircle, not_applicable: Circle,
}

export function StatusBadge({ status }: { status: StageStatus }) {
  const Icon = icons[status]
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${styles[status]}`}><Icon className="size-3.5" aria-hidden="true" />{statusLabel(status)}</span>
}
