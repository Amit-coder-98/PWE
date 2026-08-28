import { AlertCircle, X } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Yes, continue', onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open, onCancel])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/55 p-3 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onCancel() }}>
    <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><AlertCircle className="size-6" /></span>
        <div className="min-w-0 flex-1"><h2 id="confirm-title" className="text-lg font-bold text-navy-900">{title}</h2><p id="confirm-message" className="mt-1 text-sm leading-6 text-slate-600">{message}</p></div>
        <button className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={onCancel} aria-label="Close confirmation"><X className="size-5" /></button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3"><button className="secondary-button" onClick={onCancel} autoFocus>Cancel</button><button className="primary-button" onClick={onConfirm}>{confirmLabel}</button></div>
      <p className="mt-3 text-center text-xs text-slate-500">Nothing will change until you confirm.</p>
    </section>
  </div>
}
