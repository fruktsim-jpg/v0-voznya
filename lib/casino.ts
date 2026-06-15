// Server-only read helpers for the public Casino section. READ-ONLY: the bot is
// the single writer (one transaction per spin, reason='casino', meta {bet,
// payout, outcome, multiplier}). The site never plays or writes — this only
// surfaces community activity and stats. Degrades to empty/null pre-data.
import 'server-only'

import { query } from './db'
import type { QueryResultRow } from 'pg'

const NUM = (v: string | null | undefined): number => (v == null ? 0 : Number(v))

async function safeRows<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]> {
  try {
    return await query<T>(sql, params)
  } catch {
    return []
  }
}

export type CasinoPulse = {
  // Активность за 24ч — «что происходит в азартной части прямо сейчас».
  spins24h: number
  players24h: number
  biggestWin24h: number
  // Всё время.
  spinsTotal: number
  biggestWinAllTime: number
  // Отдача игрокам (RTP, 0..1+). Подаётся как «возвращается игрокам», без
  // казино-хвастовства домом. null если ставок не было.
  payoutRate: number | null
}

/** Сводный «пульс» казино для витрины (комьюнити-ориентированный). */
export async function getCasinoPulse(): Promise<CasinoPulse> {
  const rows = await safeRows<{
    spins24h: string
    players24h: string
    biggest24h: string | null
    spins_total: string
    biggest_all: string | null
    wagered: string | null
    payout: string | null
  }>(
    `SELECT
        COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::text AS spins24h,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '24 hours')::text AS players24h,
        COALESCE(MAX((meta->>'payout')::bigint) FILTER (WHERE created_at >= now() - interval '24 hours'), 0)::text AS biggest24h,
        COUNT(*)::text AS spins_total,
        COALESCE(MAX((meta->>'payout')::bigint), 0)::text AS biggest_all,
        COALESCE(SUM((meta->>'bet')::bigint), 0)::text AS wagered,
        COALESCE(SUM((meta->>'payout')::bigint), 0)::text AS payout
       FROM transactions
      WHERE reason = 'casino' AND meta ? 'bet' AND meta ? 'payout'`,
  )
  if (rows.length === 0) {
    return {
      spins24h: 0,
      players24h: 0,
      biggestWin24h: 0,
      spinsTotal: 0,
      biggestWinAllTime: 0,
      payoutRate: null,
    }
  }
  const r = rows[0]
  const wagered = NUM(r.wagered)
  const payout = NUM(r.payout)
  return {
    spins24h: NUM(r.spins24h),
    players24h: NUM(r.players24h),
    biggestWin24h: NUM(r.biggest24h),
    spinsTotal: NUM(r.spins_total),
    biggestWinAllTime: NUM(r.biggest_all),
    payoutRate: wagered > 0 ? payout / wagered : null,
  }
}

export type CasinoSwing = {
  userId: number
  userName: string
  net: number
  bet: number
  payout: number
  createdAt: string
}

/**
 * Крупнейшие колебания казино. dir='win' → крупнейшие выигрыши, 'loss' →
 * крупнейшие риски/проигрыши. Окно по умолчанию — последние 7 дней (живость).
 */
export async function getCasinoSwings(
  dir: 'win' | 'loss',
  limit = 6,
  windowDays = 7,
): Promise<CasinoSwing[]> {
  const order = dir === 'win' ? 'DESC' : 'ASC'
  const rows = await safeRows<{
    user_id: number
    user_name: string | null
    net: string
    bet: string | null
    payout: string | null
    created_at: string
  }>(
    `SELECT t.user_id,
            COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS user_name,
            t.amount::text AS net,
            (t.meta->>'bet') AS bet,
            (t.meta->>'payout') AS payout,
            t.created_at::text AS created_at
       FROM transactions t
       JOIN users u ON u.user_id = t.user_id
      WHERE t.reason = 'casino' AND t.meta ? 'bet'
        AND t.created_at >= now() - ($2::int) * interval '1 day'
      ORDER BY t.amount ${order}
      LIMIT $1`,
    [limit, windowDays],
  )
  return rows.map((r) => ({
    userId: r.user_id,
    userName: r.user_name ?? 'Игрок',
    net: NUM(r.net),
    bet: NUM(r.bet),
    payout: NUM(r.payout),
    createdAt: r.created_at,
  }))
}

export type CasinoTopPlayer = {
  rank: number
  userId: number
  userName: string
  net: number
  spins: number
}

/**
 * Топ игроков казино по чистому результату за окно (по умолчанию 30 дней).
 * Социальное доказательство «кто сейчас в плюсе», а не агитация.
 */
export async function getCasinoTopPlayers(
  limit = 8,
  windowDays = 30,
): Promise<CasinoTopPlayer[]> {
  const rows = await safeRows<{
    user_id: number
    user_name: string | null
    net: string
    spins: string
  }>(
    `SELECT t.user_id,
            COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS user_name,
            SUM(t.amount)::text AS net,
            COUNT(*)::text AS spins
       FROM transactions t
       JOIN users u ON u.user_id = t.user_id
      WHERE t.reason = 'casino' AND t.meta ? 'bet'
        AND t.created_at >= now() - ($2::int) * interval '1 day'
      GROUP BY t.user_id, u.first_name, u.username
      HAVING SUM(t.amount) > 0
      ORDER BY SUM(t.amount) DESC
      LIMIT $1`,
    [limit, windowDays],
  )
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    userName: r.user_name ?? 'Игрок',
    net: NUM(r.net),
    spins: NUM(r.spins),
  }))
}
