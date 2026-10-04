import { useState } from 'react'
import { Eye, ReceiptText, X } from 'lucide-react'
import { api } from '../lib/api'
import { canViewArtwork } from '../lib/artwork'
import { formatDateTime } from '../lib/dateTime'
import { toast } from '../state/AppContext'
import type { DesignAsset, Order, Role } from '../types'

export function PaymentProofWorkspace({ order, role }: { order: Order; role: Role }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const [failed, setFailed] = useState(false)
  if (!['admin', 'marketing', 'accountant'].includes(role)) return null
  const proofs = (order.paymentProofs ?? []).filter(asset => asset.assetType === 'payment_proof')
  const view = async (asset: DesignAsset) => {
    setBusyId(asset.id)
    setPreview(null)
    setFailed(false)
    try {
      const result = await api.viewAsset(asset.id)
      setPreview({ url: result.url, name: asset.fileName })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Payment proof is unavailable.', 'error')
    } finally { setBusyId(null) }
  }
  return (
    <section className="surface mt-4 p-5" aria-label="Payment proofs">
      <h2 className="flex items-center gap-2 font-bold text-navy-900"><ReceiptText className="size-5 shrink-0 text-sky-700" />Advance payment proofs</h2>
      <p className="mt-1 text-sm text-slate-500">View the payment screenshots uploaded when this order was booked. These are separate from customer artwork.</p>
      <p className="mt-1 text-xs text-slate-500">Current storage policy: screenshots are scheduled for cleanup 30 days after the order is completed or cancelled.</p>
      <div className="mt-4 space-y-3">
        {proofs.map(asset => (
          <article className="rounded-xl border border-slate-200 p-3" key={asset.id}>
            <p className="break-all font-bold text-navy-900">{asset.fileName}</p>
            <p className="mt-1 break-words text-xs text-slate-500">{asset.uploadedByName} · {formatDateTime(asset.createdAt)}</p>
            {!canViewArtwork(asset) && <p className="mt-2 text-sm text-slate-600">{asset.status === 'pending' ? 'Upload not completed.' : asset.status === 'deleted' ? 'This screenshot is no longer stored.' : asset.validationError || 'Upload could not be verified.'}</p>}
            <button className="secondary-button mt-3" disabled={!canViewArtwork(asset) || busyId !== null} onClick={() => void view(asset)} aria-label={`View payment proof ${asset.fileName}`}>
              <Eye className="size-4" />{busyId === asset.id ? 'Loading proof…' : 'View payment proof'}
            </button>
          </article>
        ))}
        {!proofs.length && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No advance payment screenshot was uploaded for this order.</p>}
      </div>
      {preview && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="min-w-0 break-all font-bold">{preview.name}</p>
          <button className="secondary-button shrink-0" aria-label="Close payment proof preview" onClick={() => setPreview(null)}><X className="size-4" />Close</button>
        </div>
        {failed ? <p className="text-sm text-red-700">The private link may have expired. Click View payment proof again to refresh it.</p> : <img className="mx-auto max-h-[32rem] max-w-full object-contain" src={preview.url} alt={`Payment proof: ${preview.name}`} onError={() => setFailed(true)} />}
      </div>}
    </section>
  )
}
