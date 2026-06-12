import 'server-only'
import { query } from '@/lib/db'
import { isLiveNow, type ContentStatus } from '@/lib/admin/lifecycle'
import { FEATURED_SURFACES } from '@/lib/admin/schemas'

/**
 * Featured engine (Featured Slots — one engine, many consumers). Replaces
 * heuristic "featured item" with authored, surface-keyed slots. Each surface
 * (HOME_HERO, SHOP_HERO, CASES_HERO, PLAY_HERO, CASINO_HERO, SEASON_HERO) asks
 * `featuredFor(surface)` and gets the authored, in-window entries by priority.
 *
 * Pattern A read side. Availability windows are honored here (scheduled rows go
 * live only inside [available_from, available_until]). Degrades to [] without
 * the 0039 migration.
 */

export type FeaturedSurface = (typeof FEATURED_SURFACES)[number]

export type FeaturedEntry = {
  surface: string
  ref_type: 'item' | 'case' | 'collection' | 'gift'
  ref_code: string
  title: string | null
  subtitle: string | null
  priority: number
  status: ContentStatus
  available_from: string | null
  available_until: string | null
}

export function isFeaturedSurface(v: string): v is FeaturedSurface {
  return (FEATURED_SURFACES as readonly string[]).includes(v)
}

/**
 * Authored, currently-live featured entries for a surface, highest priority
 * first (lower number = higher). Filters availability windows in JS so a single
 * cached query can serve any "now".
 */
export async function featuredFor(surface: FeaturedSurface): Promise<FeaturedEntry[]> {
  let rows: FeaturedEntry[] = []
  try {
    rows = await query<FeaturedEntry>(
      `SELECT surface, ref_type, ref_code, title, subtitle, priority,
              status, available_from, available_until
         FROM featured_slots
        WHERE surface = $1
          AND status IN ('published', 'scheduled')
        ORDER BY priority, updated_at DESC`,
      [surface],
    )
  } catch {
    return []
  }
  const now = new Date()
  return rows.filter((r) =>
    isLiveNow(r.status, r.available_from, r.available_until, now),
  )
}

/** Single top entry for a surface (most heroes show one). */
export async function topFeatured(surface: FeaturedSurface): Promise<FeaturedEntry | null> {
  const all = await featuredFor(surface)
  return all[0] ?? null
}
