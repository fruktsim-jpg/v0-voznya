'use client'

// =============================================================================
// VOZNYA — ITEM ART: client overlay hydrator (Item Authoring IA-1)
// =============================================================================
//
// `resolveItemArt` is synchronous and runs in client components too, so the
// dynamic asset overlay (published `item_assets`) must exist in the client
// bundle's module memory as well as the server's. The root layout reads the
// overlay server-side and passes the serialized snapshot here; we apply it into
// the shared manifest module synchronously on first render (and on change), so
// the very first client paint already resolves authored art.
//
// This carries NO image bytes — only `{ code: { src, placeholder } }` pointers
// to the cached `/api/items/asset/{code}` route. Tiny + safe to serialize.
// =============================================================================

import { useRef } from 'react'
import { setDynamicAssetOverlay, type ManifestAsset } from '@/lib/item-art/manifest'

export function ItemArtHydrator({
  overlay,
  version,
}: {
  overlay: Record<string, ManifestAsset>
  version: number
}) {
  // Apply during render (before children paint), once per snapshot version.
  const applied = useRef<number | null>(null)
  if (applied.current !== version) {
    setDynamicAssetOverlay(overlay, version)
    applied.current = version
  }
  return null
}
