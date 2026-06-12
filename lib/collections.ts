import 'server-only'
import { query } from '@/lib/db'
import { LIVE_STATUSES } from '@/lib/admin/lifecycle'

/**
 * Collections reader (Collections Foundation, Pattern A read side). Public
 * surfaces use `liveCollections()`; admin uses the API. Degrades to [] if the
 * 0038 migration isn't applied yet.
 */

export type Collection = {
  code: string
  name: string
  description: string | null
  kind: string
  season_code: string | null
  sort_order: number
  status: string
}

export async function liveCollections(): Promise<Collection[]> {
  try {
    return await query<Collection>(
      `SELECT code, name, description, kind, season_code, sort_order, status
         FROM collections
        WHERE status = ANY($1::text[])
        ORDER BY sort_order, name`,
      [LIVE_STATUSES],
    )
  } catch {
    return []
  }
}

export async function collectionByCode(code: string): Promise<Collection | null> {
  try {
    const rows = await query<Collection>(
      `SELECT code, name, description, kind, season_code, sort_order, status
         FROM collections WHERE code = $1 LIMIT 1`,
      [code],
    )
    return rows[0] ?? null
  } catch {
    return null
  }
}
