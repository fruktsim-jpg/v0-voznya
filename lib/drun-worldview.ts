import 'server-only'
import { unstable_cache } from 'next/cache'
import { query } from '@/lib/db'

/**
 * Drun worldview loader (Phase A — "Хроники друна" on /drun).
 *
 * READ-ONLY view of the chronicle Drun's worldview loop already writes to
 * `ai_memories` (voznya-bot/app/features/drun/worldview.py): storylines it is
 * tracking, dated predictions it has made (with hit/miss outcomes), and legends
 * it has enshrined. This intelligence is computed on the bot's 4h worldview job
 * and, until now, only ever fed back into Drun's own prompt — players never saw
 * it. We surface it as-is.
 *
 * Storage (no new table, no migration):
 *   - kind='storyline'   subject_id NULL   — ongoing storyline about the world
 *   - kind='prediction'  expires_at=due    — a dated prediction; status lives in
 *                         `source`: 'prediction' (open) / 'prediction_hit' /
 *                         'prediction_miss'
 *   - kind='legend'      high weight, no TTL — an enshrined chat myth
 *
 * Degrades to empty on any error (un-migrated DB / outage), exactly like
 * `drun-feed.ts` — the section simply doesn't render. No writes, no authority.
 */

export type DrunStoryline = { id: string; text: string }
export type DrunLegend = { id: string; text: string }
export type DrunPrediction = {
  id: string
  text: string
  status: 'open' | 'hit' | 'miss'
}

export type DrunWorldview = {
  storylines: DrunStoryline[]
  predictions: DrunPrediction[]
  legends: DrunLegend[]
  hasContent: boolean
}

const EMPTY: DrunWorldview = {
  storylines: [],
  predictions: [],
  legends: [],
  hasContent: false,
}

type Row = { id: string; kind: string; fact: string; source: string | null }

function predictionStatus(source: string | null): DrunPrediction['status'] {
  if (source === 'prediction_hit') return 'hit'
  if (source === 'prediction_miss') return 'miss'
  return 'open'
}

async function _getDrunWorldview(): Promise<DrunWorldview> {
  try {
    // Mirror the bot's worldview_block ordering (weight DESC, updated_at DESC),
    // excluding expired predictions. Storylines/legends carry no TTL; the
    // `expires_at` guard only meaningfully filters stale predictions.
    const rows = await query<Row>(
      `SELECT id, kind, fact, source
         FROM ai_memories
        WHERE kind IN ('storyline','prediction','legend')
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY weight DESC, updated_at DESC
        LIMIT 40`,
    )

    const storylines: DrunStoryline[] = []
    const predictions: DrunPrediction[] = []
    const legends: DrunLegend[] = []

    for (const r of rows) {
      const text = (r.fact ?? '').trim()
      if (!text) continue
      if (r.kind === 'storyline' && storylines.length < 6) {
        storylines.push({ id: String(r.id), text })
      } else if (r.kind === 'prediction' && predictions.length < 6) {
        predictions.push({ id: String(r.id), text, status: predictionStatus(r.source) })
      } else if (r.kind === 'legend' && legends.length < 6) {
        legends.push({ id: String(r.id), text })
      }
    }

    const hasContent =
      storylines.length > 0 || predictions.length > 0 || legends.length > 0
    return { storylines, predictions, legends, hasContent }
  } catch {
    return EMPTY
  }
}

/**
 * Cached (60s, tag `drun-worldview`) read-only worldview chronicle. Always
 * resolves — returns an empty, `hasContent: false` payload on any failure so the
 * caller can simply omit the section.
 */
export const getDrunWorldview = unstable_cache(_getDrunWorldview, ['drun-worldview'], {
  revalidate: 60,
  tags: ['drun-worldview'],
})
