'use client'

import type { InventoryItem } from '@/lib/inventory-list'
import { InventoryRedesign } from '@/components/inventory/inventory-redesign'

/**
 * InventoryClient — compatibility shim (VOZNYA Stage 2).
 *
 * The Stage 2 inventory redesign lives in components/inventory/*. This file
 * keeps the original public export (`InventoryClient`, same `{ initial }`
 * prop) so the frozen app/inventory/page.tsx import keeps working WITHOUT any
 * page change. The old Steam-style grid + all gift action logic were moved
 * into the redesign (ItemInspectSheet) with the API contracts unchanged.
 */
export function InventoryClient({
  initial,
  userId,
}: {
  initial: InventoryItem[]
  userId?: number
}) {
  return <InventoryRedesign initial={initial} userId={userId} />
}
