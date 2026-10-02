import type { DesignAsset, Role } from "../types";

export function artworkAccess(role: Role) {
  const canUpload = role === "admin" || role === "marketing";
  return { canUpload, canView: canUpload || role === "designer" };
}

export function canViewArtwork(asset: DesignAsset) {
  return !["pending", "rejected", "deleted"].includes(asset.status);
}
