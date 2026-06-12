// =============================================================================
// VOZNYA — ITEM ART: dynamic manifest source (Item Authoring IA-1, server-only)
// =============================================================================
//
// Bridges the DB-authored art layer (`item_assets`, status=published) into the
// SYNCHRONOUS resolver. Flow:
//
//   DB (item_assets, published)
//     → loadPublishedAssetOverlay()           [server, cached]
//     → setDynamicAssetOverlay(overlay)        [populates the in-memory overlay]
//     → resolveItemArt(code) sees authored art [every surface, zero per-surface code]
//
// Asset bytes are NOT inlined here — the overlay points each code at the cached
// serving route `/api/items/asset/{code}?v={version}`, so the resolver stays a
// pure string lookup and the browser caches the image normally.
//
// Pattern A: this only READS the content catalog. No economy / user / grant
// access. Safe to call from any server context (layouts, pages, route handlers).
// =============================================================================

import 'server-only'
import { query, isDbConfigured } from '@/lib/db'
import {
  setDynamicAssetOverlay,
  getDynamicAssetOverlay,
  type ManifestAsset,
} from '@/lib/item-art/manifest'

export const ASSET_ROUTE_PREFIX = '/api/items/asset'

/** URL for a published asset code, version-busted so re-uploads invalidate cache. */
export function assetUrl(code: string, version: number): string {
  return `${ASSET_ROUTE_PREFIX}/${encodeURIComponent(code)}?v=${version}`
}

type AssetRow = {
  code: string
  version: number
  placeholder: string | null
}

// Process-level cache so we don't hit the DB on every render. Short TTL keeps
// newly-published art visibly "live within minutes" without per-request load.
const TTL_MS = 30_000
let cachedAt = 0
let cachedSnapshot: Record<string, ManifestAsset> = {}
let inflight: Promise<Record<string, ManifestAsset>> | null = null

async function readPublished(): Promise<Record<string, ManifestAsset>> {
  if (!isDbConfigured()) return {}
  let rows: AssetRow[] = []
  try {
    rows = await query<AssetRow>(
      `SELECT code, version, placeholder
         FROM item_assets
        WHERE status = 'published'`,
    )
  } catch {
    // Migration 0037 not applied yet — degrade to the static seed only.
    return {}
  }
  const overlay: Record<string, ManifestAsset> = {}
  for (const r of rows) {
    overlay[r.code] = {
      src: assetUrl(r.code, r.version),
      placeholder: r.placeholder ?? undefined,
      authored: true,
    }
  }
  return overlay
}

/**
 * Ensure the in-memory overlay reflects published assets. Cached with a short
 * TTL; concurrent callers share one inflight read. Returns the overlay snapshot
 * (also usable for client hydration).
 */
export async function loadPublishedAssetOverlay(
  force = false,
): Promise<Record<string, ManifestAsset>> {
  const now = Date.now()
  if (!force && now - cachedAt < TTL_MS && cachedAt !== 0) {
    return cachedSnapshot
  }
  if (inflight) return inflight
  inflight = (async () => {
    const overlay = await readPublished()
    cachedSnapshot = overlay
    cachedAt = Date.now()
    setDynamicAssetOverlay(overlay, cachedAt)
    inflight = null
    return overlay
  })()
  return inflight
}

/** Invalidate the cache immediately (called right after a publish/unpublish). */
export function invalidateAssetOverlay(): void {
  cachedAt = 0
}

/** Snapshot for serializing to the client shell (so client components resolve too). */
export function currentOverlaySnapshot(): Record<string, ManifestAsset> {
  return getDynamicAssetOverlay()
}
