import 'server-only'

import { query } from './db'

/**
 * PLAYER STATS (Statistics as a personal identity surface, not a dashboard).
 *
 * Read-only interpretation of ONE player's own trajectory + standing, answering
 * the questions the Statistics destination must answer: Who am I? Am I growing?
 * Am I richer / more active / stronger than before? It reuses the bot's ledgers
 * (transactions, mmr_entries, message_daily) — no new tables, no writes. Every
 * loader self-degrades to empty so the page never 500s.
 *
 * Trajectory is honest: balance is reconstructed by walking `transactions`
 * backward from the CURRENT balance, so the line ends exactly at today's number.
 */

const NUM = (v: string | null | undefined): number => (v == null ? 0 : Number(v))

export type TrendPoint = { day: string; value: number }

export type GrowthMetric = {
  key: 'wealth' | 'mmr' | 'voice'
  label: string
  /** current value */
  now: number
  /** value `windowDays` ago (start of the window) */
  then: number
  /** signed change over the window */
  delta: number
  /** percent change (null when `then` is 0) */
  deltaPct: number | null
  /** day-series for a sparkline/area (oldest→newest), may be empty */
  series: TrendPoint[]
}

export type PlayerStats = {
  windowDays: number
  wealth: GrowthMetric | null
  mmr: GrowthMetric | null
  voice: GrowthMetric | null
  /** one-line interpretations ("растёт", "на пике", "затишье") */
  story: string[]
}

/**
 * Reconstruct a daily balance series ending at `currentBalance`. We take the
 * net transaction delta per day for the window, then walk backward from today
 * so the final point equals the real current balance.
 */
async function wealthMetric(userId: number, currentBalance: number, days: number): Promise<GrowthMetric | null> {
  try {
    const rows = await query<{ day: string; net: string }>(
      `SELECT date_trunc('day', created_at)::date::text AS day,
              COALESCE(SUM(amount), 0)::text AS net
         FROM transactions
        WHERE user_id = $1
          AND created_at >= date_trunc('day', now()) - ($2::int - 1) * interval '1 day'
        GROUP BY 1
        ORDER BY 1`,
      [userId, days],
    )
    // Build a per-day net map, then walk backward from today's balance.
    const netByDay = new Map(rows.map((r) => [r.day, NUM(r.net)]))
    const series: TrendPoint[] = []
    const today = new Date()
    let running = currentBalance
    // Walk forward over the window for display, but compute the start value by
    // subtracting the total window delta from the current balance.
    const windowDelta = rows.reduce((s, r) => s + NUM(r.net), 0)
    const startValue = currentBalance - windowDelta
    running = startValue
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      running += netByDay.get(key) ?? 0
      series.push({ day: key.slice(5), value: Math.max(0, Math.round(running)) })
    }
    const then = series[0]?.value ?? currentBalance
    const delta = currentBalance - then
    return {
      key: 'wealth',
      label: 'Богатство',
      now: currentBalance,
      then,
      delta,
      deltaPct: then > 0 ? (delta / then) * 100 : null,
      series,
    }
  } catch {
    return null
  }
}

/** MMR series from mmr_entries (cumulative), ending at the current SUM. */
async function mmrMetric(userId: number, currentMmr: number | null, days: number): Promise<GrowthMetric | null> {
  if (currentMmr == null) return null
  try {
    const rows = await query<{ day: string; net: string }>(
      `SELECT date_trunc('day', created_at)::date::text AS day,
              COALESCE(SUM(amount), 0)::text AS net
         FROM mmr_entries
        WHERE player_id = $1
          AND created_at >= date_trunc('day', now()) - ($2::int - 1) * interval '1 day'
        GROUP BY 1 ORDER BY 1`,
      [userId, days],
    )
    const netByDay = new Map(rows.map((r) => [r.day, NUM(r.net)]))
    const windowDelta = rows.reduce((s, r) => s + NUM(r.net), 0)
    const startValue = currentMmr - windowDelta
    const series: TrendPoint[] = []
    const today = new Date()
    let running = startValue
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      running += netByDay.get(key) ?? 0
      series.push({ day: key.slice(5), value: Math.round(running) })
    }
    const then = series[0]?.value ?? currentMmr
    const delta = currentMmr - then
    return {
      key: 'mmr',
      label: 'MMR',
      now: currentMmr,
      then,
      delta,
      deltaPct: then > 0 ? (delta / then) * 100 : null,
      series,
    }
  } catch {
    return null
  }
}

/** Daily message activity from message_daily (raw per-day counts). */
async function voiceMetric(userId: number, days: number): Promise<GrowthMetric | null> {
  try {
    const rows = await query<{ day: string; count: string }>(
      `SELECT day::text AS day, COALESCE(SUM(count), 0)::text AS count
         FROM message_daily
        WHERE user_id = $1 AND day >= CURRENT_DATE - ($2::int - 1)
        GROUP BY 1 ORDER BY 1`,
      [userId, days],
    )
    if (rows.length === 0) return null
    const byDay = new Map(rows.map((r) => [r.day, NUM(r.count)]))
    const series: TrendPoint[] = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      series.push({ day: key.slice(5), value: byDay.get(key) ?? 0 })
    }
    const half = Math.floor(days / 2)
    const recent = series.slice(half).reduce((s, p) => s + p.value, 0)
    const prior = series.slice(0, half).reduce((s, p) => s + p.value, 0)
    return {
      key: 'voice',
      label: 'Активность',
      now: recent,
      then: prior,
      delta: recent - prior,
      deltaPct: prior > 0 ? ((recent - prior) / prior) * 100 : null,
      series,
    }
  } catch {
    return null
  }
}

function interpret(m: GrowthMetric | null, kind: 'wealth' | 'mmr' | 'voice'): string | null {
  if (!m) return null
  const noun = kind === 'wealth' ? 'Богатство' : kind === 'mmr' ? 'Рейтинг' : 'Активность'
  if (m.delta > 0 && (m.deltaPct == null || m.deltaPct >= 5)) {
    return `${noun} растёт${m.deltaPct != null ? ` (+${Math.round(m.deltaPct)}%)` : ''}.`
  }
  if (m.delta < 0 && (m.deltaPct == null || m.deltaPct <= -5)) {
    return `${noun} снижается${m.deltaPct != null ? ` (${Math.round(m.deltaPct)}%)` : ''}.`
  }
  return `${noun} стабильно.`
}

/** Build the personal Statistics trajectory + story for a player. */
export async function getPlayerStats(
  userId: number,
  opts: { balance: number; mmr: number | null; windowDays?: number },
): Promise<PlayerStats> {
  const days = opts.windowDays ?? 30
  const [wealth, mmr, voice] = await Promise.all([
    wealthMetric(userId, opts.balance, days),
    mmrMetric(userId, opts.mmr, days),
    voiceMetric(userId, days),
  ])
  const story = [interpret(wealth, 'wealth'), interpret(mmr, 'mmr'), interpret(voice, 'voice')].filter(
    (s): s is string => !!s,
  )
  return { windowDays: days, wealth, mmr, voice, story }
}
