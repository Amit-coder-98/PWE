import { useState } from "react";
import { Eye, ImagePlus, Upload, X } from "lucide-react";
import { api } from "../lib/api";
import { artworkAccess, canViewArtwork } from "../lib/artwork";
import { formatDateTime } from "../lib/dateTime";
import { toast } from "../state/AppContext";
import type { DesignAsset, Order, Role } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

export function DesignWorkspace({ order, setOrder, reload, role }: {
  order: Order;
  setOrder: (order: Order) => void;
  reload: () => Promise<void>;
  role: Role;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [confirmNoImage, setConfirmNoImage] = useState(false);
  const access = artworkAccess(role);
  const canUpload = access.canUpload && order.status === "active";
  const assets = (order.designAssets ?? []).filter((asset) => asset.assetType !== "payment_proof");

  const upload = async () => {
    if (!file || !canUpload) return;
    setBusy(true);
    setProgress(0);
    try {
      const intent = await api.uploadIntent(order.id, file);
      await api.uploadToR2(intent.uploadUrl, file, setProgress);
      await api.completeUpload(intent.asset.id);
      setOrder(await api.order(order.id));
      setFile(null);
      await reload();
      toast("Customer-approved artwork uploaded. The Designer can view it now.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const view = async (asset: DesignAsset) => {
    setViewingId(asset.id);
    try {
      const result = await api.viewAsset(asset.id);
      setPreviewFailed(false);
      setPreview({ url: result.url, name: asset.fileName });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Image unavailable.", "error");
    } finally {
      setViewingId(null);
    }
  };

  const noImage = async () => {
    setBusy(true);
    try {
      await api.noImage(order, "Customer confirmed that no image was supplied.");
      setOrder(await api.order(order.id));
      await reload();
      toast("No customer image confirmed. Plate preparation is now ready.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not confirm.", "error");
    } finally {
      setBusy(false);
      setConfirmNoImage(false);
    }
  };

  if (!access.canView) return null;
  return (
    <section className="surface mt-4 p-5" id="design-workspace">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{access.canUpload ? "Marketing / Admin" : "Designer"}</p>
          <h2 className="mt-1 text-xl font-bold text-navy-900">Customer design images</h2>
          <p className="mt-1 text-sm text-slate-600">
            {access.canUpload
              ? "Upload customer-approved artwork for the Designer. No additional customer approval is required here."
              : "View the artwork uploaded by Marketing or Admin, then complete your Design preparation task when ready."}
          </p>
        </div>
        {canUpload && order.stages.design.status !== "completed" && !assets.some(canViewArtwork) && (
          <button className="secondary-button" disabled={busy} onClick={() => setConfirmNoImage(true)}>No customer image</button>
        )}
      </div>
      <div className={`mt-5 grid gap-4 ${canUpload ? "lg:grid-cols-[.7fr_1.3fr]" : ""}`}>
        {canUpload && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-5 text-center">
            <ImagePlus className="mx-auto size-9 text-slate-400" />
            <label className="primary-button mt-4">
              <Upload className="size-4" />Choose image
              <input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                disabled={busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            <p className="mt-3 text-xs text-slate-500">JPG, JPEG, PNG or WebP · Maximum 10 MB</p>
            {file && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-left text-sm">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button className="primary-button mt-3 w-full" onClick={() => void upload()} disabled={busy}>
                  {busy ? `Uploading ${progress}%` : "Upload as new version"}
                </button>
              </div>
            )}
          </div>
        )}
        <div>
          <h3 className="font-bold text-navy-900">Uploaded artwork</h3>
          <div className="mt-3 space-y-2">
            {assets.map((asset) => (
              <article className="rounded-xl border border-slate-200 p-3" key={asset.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="break-all font-bold">Version {asset.version} · {asset.fileName}</p>
                    <p className="break-words text-xs text-slate-500">{asset.uploadedByName} · {formatDateTime(asset.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">
                    {asset.status === "approved" ? "Customer-approved artwork" : asset.status === "available" ? "Uploaded" : asset.status.replaceAll("_", " ")}
                  </span>
                </div>
                {asset.status === "rejected" && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">
                    Upload failed: {asset.validationError || "The image could not be verified."} Ask Marketing or Admin to upload it again.
                  </p>
                )}
                <button className="secondary-button mt-3" disabled={!canViewArtwork(asset) || viewingId === asset.id}
                  onClick={() => void view(asset)} aria-label={`View design image ${asset.fileName}`}>
                  <Eye className="size-4" />{viewingId === asset.id ? "Loading image…" : "View image"}
                </button>
              </article>
            ))}
            {!assets.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No design images uploaded yet.{!access.canUpload && " Ask Marketing or Admin to add the customer's artwork."}</p>}
          </div>
        </div>
      </div>
      {preview && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="break-all font-bold">{preview.name}</p>
            <button className="secondary-button shrink-0" aria-label="Close image preview" onClick={() => setPreview(null)}><X className="size-4" />Close</button>
          </div>
          {previewFailed
            ? <p className="text-sm text-red-700">The image could not be loaded. Click View image again to get a fresh private link.</p>
            : <img src={preview.url} alt={`Customer design: ${preview.name}`} className="mx-auto max-h-[32rem] max-w-full object-contain" onError={() => setPreviewFailed(true)} />}
        </div>
      )}
      <ConfirmDialog open={confirmNoImage} title="Confirm no customer image"
        message="This completes Design without an image. Plate preparation remains required before Printing."
        confirmLabel="Yes, confirm" onCancel={() => setConfirmNoImage(false)} onConfirm={() => void noImage()} />
    </section>
  );
}
