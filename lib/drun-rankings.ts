import 'server-only'
import { unstable_cache } from 'next/cache'
import { query } from '@/lib/db'
import {
  parseOpinion,
  favoriteScore,
  standing,
  FAVORITE_SCORE_MIN,
  FOE_SCORE_MAX,
  type RawOpinion,
} from '@/lib/drun-personal-logic'

/**
 * Drun social rankings (Phase B #5) — "любимчики / на карандаше".
 *
 * READ-ONLY mirror of the bot's opinions.rank_chat: scan players whose opinion
 * vector is FORMED, score each with favorite_score (after time-decay), and
 * surface the strongest two ends — Drun's favorites and the players on his
 * notice list. The opinion vectors are already persisted in
 * `ai_profiles.data.opinion` by the bot's profile sweep; we only read + rank.
 *
 * No writes, no authority, no new AI infra. Cached (60s) and fail-silent: any
 * error / un-migrated DB → empty lists → the section doesn't render.
 *
 * Cutoffs mirror rank_chat exactly: a favorite needs score > +15, a foe needs
 * score < -15 (ties at ±15 are excluded), top 5 each.
 */

export type DrunRankedPlayer = {
  userId: number
  name: string
  /** Social-role title (ЛЮБИМЧИК / УВАЖАЕМЫЙ / БЕСИТ / …). */
  standing: string
  /** Rounded favorite score (sign indicates favorite vs on-notice). */
  score: number
}

export type DrunRankings = {
  favorites: DrunRankedPlayer[]
  onNotice: DrunRankedPlayer[]
  hasContent: boolean
}

const EMPTY: DrunRankings = { favorites: [], onNotice: [], hasContent: false }

// Cap the scan: the bot's rank_chat uses limit=200. Active formed-opinion
// profiles are far fewer, but we bound it to keep the query cheap.
const SCAN_LIMIT = 200

type Row = {
  user_id: string
  opinion: RawOpinion | null
  first_name: string | null
  username: string | null
}

function displayName(firstName: string | null, username: string | null): string {
  if (firstName && firstName.trim()) return firstName.trim()
  if (username && username.trim()) return `@${username.trim()}`
  return 'Игрок'
}

async function _getDrunRankings(): Promise<DrunRankings> {
  try {
    const rows = await query<Row>(
      `SELECT p.user_id,
              p.data->'opinion' AS opinion,
              u.first_name,
              u.username
         FROM ai_profiles p
         LEFT JOIN users u ON u.user_id = p.user_id
        WHERE p.data ? 'opinion'
        LIMIT $1`,
      [SCAN_LIMIT],
    )

    const now = new Date()
    const scored: DrunRankedPlayer[] = []
    for (const r of rows) {
      const op = parseOpinion(r.opinion, now)
      if (!op.isFormed) continue // never rank an unsettled opinion (mirror rank_chat)
      const score = favoriteScore(op)
      scored.push({
        userId: Number(r.user_id),
        name: displayName(r.first_name, r.username),
        standing: standing(op),
        score: Math.round(score * 10) / 10,
      })
    }

    const favorites = scored
      .filter((p) => p.score > FAVORITE_SCORE_MIN)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    const onNotice = scored
      .filter((p) => p.score < FOE_SCORE_MAX)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)

    const hasContent = favorites.length > 0 || onNotice.length > 0
    return { favorites, onNotice, hasContent }
  } catch {
    return EMPTY
  }
}

/**
 * Cached (60s, tag `drun-rankings`) read-only favorites / on-notice lists.
 * Always resolves; returns empty `hasContent: false` on any failure.
 */
export const getDrunRankings = unstable_cache(_getDrunRankings, ['drun-rankings'], {
  revalidate: 60,
  tags: ['drun-rankings'],
})
