import 'server-only'

import { unstable_cache } from 'next/cache'
import { query } from '@/lib/db'
import type { CommunityEvent } from '@/lib/events'
import type { Rarity } from '@/lib/rarity'
import { RARITY_ORDER } from '@/lib/rarity'

/**
 * World Pulse — the shared "state of VOZNYA right now" layer.
 *
 * Single owner of two derivations used by BOTH Home (teaser) and Live (full):
 *   1. getWorldPulse() — real 24h aggregates (cases opened, ешки won, jackpots,
 *      active players) straight off existing ledgers. No new tables/migrations.
 *   2. deriveHotToday() — ranks an ALREADY-FETCHED community feed into the day's
 *      biggest win / rarest drop / jackpot+gift counts. Moved here from
 *      home-context so there is exactly ONE implementation.
 *
 * Read-only, server-only. Degrades to zeros/null on any error (un-migrated DB),
 * like every other site loader. Honest: every number comes from a real row.
 */

// --- 24h pulse aggregates ---------------------------------------------------

export type WorldPulse = {
  /** Кейсов открыто за последние 24ч. */
  casesOpened: number
  /** Ешек выиграно за 24ч (выплаты кейсов(не tg_gift) + casino payout + treasure). */
  eshWon: number
  /** Джекпотов сорвано за 24ч. */
  jackpots: number
  /** Активных игроков за 24ч (users.last_active_at). null если колонки нет. */
  activePlayers: number | null
}

const EMPTY_PULSE: WorldPulse = { casesOpened: 0, eshWon: 0, jackpots: 0, activePlayers: null }

/**
 * Process-cached column-existence check. Mirrors the Map-based memoization in
 * lib/queries.ts so we don't probe information_schema on every getWorldPulse
 * call — schema is stable at runtime.
 */
const columnPresence = new Map<string, boolean>()
async function columnExists(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`
  const cached = columnPresence.get(key)
  if (cached !== undefined) return cached
  try {
    const rows = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2
       ) AS exists`,
      [table, column],
    )
    const present = Boolean(rows[0]?.exists)
    columnPresence.set(key, present)
    return present
  } catch {
    return false
  }
}

/**
 * Build the day's pulse from existing ledgers over a rolling 24h window. Each
 * metric is its own guarded query so one missing table never blanks the rest.
 */
export async function getWorldPulse(): Promise<WorldPulse> {
  return _getWorldPulse()
}

const _getWorldPulse = unstable_cache(
  async (): Promise<WorldPulse> => {
  const [casesOpened, jackpots, eshWon, activePlayers] = await Promise.all([
    // Кейсов открыто за 24ч.
    query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM case_openings
        WHERE created_at >= now() - interval '24 hours'`,
    )
      .then((r) => Number(r[0]?.n ?? 0))
      .catch(() => 0),

    // Джекпотов сорвано за 24ч.
    query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM case_openings co
         JOIN case_rewards cr ON cr.id = co.reward_id
        WHERE cr.is_jackpot AND co.created_at >= now() - interval '24 hours'`,
    )
      .then((r) => Number(r[0]?.n ?? 0))
      .catch(() => 0),

    // Ешек выиграно за 24ч: выплаты кейсов (кроме tg_gift) + casino payout + treasure.
    Promise.all([
      query<{ s: string }>(
        `SELECT COALESCE(SUM(co.amount), 0)::text AS s
           FROM case_openings co
          WHERE co.created_at >= now() - interval '24 hours'
            AND co.reward_kind <> 'tg_gift'
            AND co.amount > 0`,
      )
        .then((r) => Number(r[0]?.s ?? 0))
        .catch(() => 0),
      query<{ s: string }>(
        `SELECT COALESCE(SUM((meta->>'payout')::bigint), 0)::text AS s
           FROM transactions
          WHERE reason = 'casino' AND meta ? 'payout'
            AND created_at >= now() - interval '24 hours'`,
      )
        .then((r) => Number(r[0]?.s ?? 0))
        .catch(() => 0),
      query<{ s: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS s
           FROM transactions
          WHERE reason = 'treasure' AND amount > 0
            AND created_at >= now() - interval '24 hours'`,
      )
        .then((r) => Number(r[0]?.s ?? 0))
        .catch(() => 0),
    ]).then(([a, b, c]) => a + b + c),

    // Активных игроков за 24ч — только если колонка last_active_at есть.
    columnExists('users', 'last_active_at').then((has) =>
      has
        ? query<{ n: string }>(
            `SELECT COUNT(*)::text AS n FROM users
              WHERE last_active_at >= now() - interval '24 hours'`,
          )
            .then((r) => Number(r[0]?.n ?? 0))
            .catch(() => null)
        : null,
    ),
  ]).catch(() => [0, 0, 0, null] as const)

  return { casesOpened, eshWon, jackpots, activePlayers } as WorldPulse
  },
  ['world-pulse'],
  { revalidate: 30, tags: ['world-pulse'] },
)

export async function getWorldPulseSafe(): Promise<WorldPulse> {
  try {
    return await getWorldPulse()
  } catch {
    return EMPTY_PULSE
  }
}

// --- Hot today (derived from an already-fetched feed) -----------------------

export type HotHighlight = {
  id: string
  label: string
  actorName: string
  actorId: number
  value: number | null
  rarity: Rarity
  icon: string
  occurredAt: string
}

export type HotToday = {
  biggestWin: HotHighlight | null
  rarestDrop: HotHighlight | null
  jackpots: number
  giftDrops: number
}

function toHighlight(e: CommunityEvent, label: string): HotHighlight {
  return {
    id: e.id,
    label,
    actorName: e.actor.name,
    actorId: e.actor.id,
    value: e.value ?? null,
    rarity: e.rarity,
    icon: e.icon,
    occurredAt: e.occurredAt,
  }
}

/**
 * Rank an already-fetched community feed into the day's highlights. Honest: it
 * only orders events the feed already returned; no fabricated superlatives.
 */
export function deriveHotToday(feed: CommunityEvent[]): HotToday {
  let biggestWin: CommunityEvent | null = null
  let rarestDrop: CommunityEvent | null = null
  let jackpots = 0
  let giftDrops = 0

  for (const e of feed) {
    if (e.code === 'CASE_JACKPOT') jackpots++
    if (e.code === 'CASE_GIFT_DROP' || e.code === 'GIFT_DELIVERED') giftDrops++

    if (e.value != null && (biggestWin == null || e.value > (biggestWin.value ?? 0))) {
      biggestWin = e
    }

    if (rarestDrop == null) {
      rarestDrop = e
    } else {
      const a = RARITY_ORDER.indexOf(e.rarity)
      const b = RARITY_ORDER.indexOf(rarestDrop.rarity)
      if (a > b || (a === b && (e.value ?? 0) > (rarestDrop.value ?? 0))) {
        rarestDrop = e
      }
    }
  }

  return {
    biggestWin: biggestWin ? toHighlight(biggestWin, 'Крупнейший выигрыш') : null,
    rarestDrop: rarestDrop ? toHighlight(rarestDrop, 'Редчайший дроп') : null,
    jackpots,
    giftDrops,
  }
}
