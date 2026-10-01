import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type Toast = { message: string; kind: 'success' | 'error' }

export function ToastHost() {
  const [toast, setToast] = useState<Toast | null>(null)
  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<Toast>).detail
      setToast(detail)
      window.setTimeout(() => setToast(null), 4500)
    }
    window.addEventListener('pb-toast', show)
    return () => window.removeEventListener('pb-toast', show)
  }, [])
  if (!toast) return null
  const Icon = toast.kind === 'success' ? CheckCircle2 : AlertTriangle
  return <div className={`fixed bottom-20 left-3 right-3 z-[70] mx-auto flex max-w-md items-start gap-3 rounded-xl border p-4 shadow-xl md:bottom-5 ${toast.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`} role={toast.kind === 'error' ? 'alert' : 'status'}><Icon className="mt-0.5 size-5 shrink-0" /><p className="flex-1 text-sm font-semibold">{toast.message}</p><button className="grid size-8 place-items-center rounded-lg" onClick={() => setToast(null)} aria-label="Dismiss message"><X className="size-4" /></button></div>
}
