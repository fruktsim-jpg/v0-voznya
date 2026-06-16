import 'server-only'
import { query } from '@/lib/db'

/**
 * Сезонная система — слой данных сайта (read + admin actions).
 *
 * ВАЖНО: дивизионы и длительность сезона продублированы из бота
 * (`app/settings/season.py`). Менять оба места синхронно. Сайт — главный
 * интерфейс (website-first), бот — резерв/уведомления.
 */

// --- Дивизионы (зеркало app/settings/season.py DIVISIONS) -------------------

export interface Division {
  minMmr: number
  emoji: string
  name: string
  rewardEshki: number
}

export const DIVISIONS: Division[] = [
  { minMmr: 0, emoji: '🥉', name: 'Bronze', rewardEshki: 0 },
  { minMmr: 500, emoji: '🥈', name: 'Silver', rewardEshki: 200 },
  { minMmr: 1500, emoji: '🥇', name: 'Gold', rewardEshki: 500 },
  { minMmr: 3500, emoji: '💠', name: 'Platinum', rewardEshki: 1200 },
  { minMmr: 7000, emoji: '💎', name: 'Diamond', rewardEshki: 2500 },
  { minMmr: 12000, emoji: '🏅', name: 'Master', rewardEshki: 5000 },
]

export const SEASON_LENGTH_DAYS = 56

/** Возвращает дивизион для значения сезонного MMR. */
export function getDivision(seasonMmr: number): Division {
  let current = DIVISIONS[0]
  for (const d of DIVISIONS) {
    if (seasonMmr >= d.minMmr) current = d
    else break
  }
  return current
}

/** Прогресс до следующего дивизиона: 0..1 и сколько MMR осталось. */
export function divisionProgress(seasonMmr: number): {
  current: Division
  next: Division | null
  ratio: number
  toNext: number
} {
  const current = getDivision(seasonMmr)
  const idx = DIVISIONS.findIndex((d) => d.name === current.name)
  const next = idx >= 0 && idx < DIVISIONS.length - 1 ? DIVISIONS[idx + 1] : null
  if (!next) return { current, next: null, ratio: 1, toNext: 0 }
  const span = next.minMmr - current.minMmr
  const got = seasonMmr - current.minMmr
  return {
    current,
    next,
    ratio: span > 0 ? Math.min(1, Math.max(0, got / span)) : 1,
    toNext: Math.max(0, next.minMmr - seasonMmr),
  }
}

// --- Типы строк -------------------------------------------------------------

export interface SeasonInfo {
  id: number
  name: string
  startedAt: string
  endsAt: string
  isActive: boolean
  finalizedAt: string | null
}

export interface SeasonLeaderRow {
  userId: number
  name: string | null
  username: string | null
  seasonMmr: number
  division: Division
}

export interface SeasonProfile {
  seasonMmr: number
  division: Division
  rank: number | null
  titles: string[]
}

// --- Чтение -----------------------------------------------------------------

/** Активный сезон (или null). */
export async function getActiveSeason(): Promise<SeasonInfo | null> {
  const rows = await query<{
    id: number
    name: string
    started_at: string
    ends_at: string
    is_active: boolean
    finalized_at: string | null
  }>(
    `SELECT id, name, started_at, ends_at, is_active, finalized_at
       FROM seasons WHERE is_active = true LIMIT 1`,
  )
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.id,
    name: r.name,
    startedAt: r.started_at,
    endsAt: r.ends_at,
    isActive: r.is_active,
    finalizedAt: r.finalized_at,
  }
}

/** Все сезоны (новые сверху) — для админ-истории. */
export async function listSeasons(): Promise<SeasonInfo[]> {
  const rows = await query<{
    id: number
    name: string
    started_at: string
    ends_at: string
    is_active: boolean
    finalized_at: string | null
  }>(
    `SELECT id, name, started_at, ends_at, is_active, finalized_at
       FROM seasons ORDER BY id DESC LIMIT 50`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startedAt: r.started_at,
    endsAt: r.ends_at,
    isActive: r.is_active,
    finalizedAt: r.finalized_at,
  }))
}

/** Топ игроков по сезонному MMR. */
export async function getSeasonLeaderboard(
  limit = 50,
): Promise<SeasonLeaderRow[]> {
  const rows = await query<{
    user_id: number
    first_name: string | null
    username: string | null
    season_mmr: number
  }>(
    `SELECT user_id, first_name, username, season_mmr
       FROM users
      WHERE season_mmr > 0
      ORDER BY season_mmr DESC
      LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.first_name,
    username: r.username,
    seasonMmr: r.season_mmr,
    division: getDivision(r.season_mmr),
  }))
}

/** Распределение игроков по дивизионам (для админ-обзора). */
export async function getDivisionCounts(): Promise<
  { division: Division; players: number }[]
> {
  // Бакетим в одном SQL: CASE по порогам дивизионов (от высокого к низкому)
  // + GROUP BY, вместо выборки всех игроков и подсчёта в JS. Пороги берём из
  // DIVISIONS — источник правды (зеркало app/settings/season.py).
  const ordered = [...DIVISIONS].sort((a, b) => b.minMmr - a.minMmr)
  const caseExpr = ordered
    .map((d) => `WHEN season_mmr >= ${d.minMmr} THEN '${d.name}'`)
    .join('\n        ')

  const rows = await query<{ division: string; players: string }>(
    `SELECT CASE
        ${caseExpr}
      END AS division,
      COUNT(*)::text AS players
       FROM users
      WHERE season_mmr > 0
      GROUP BY 1`,
  )
  const counts = new Map<string, number>(
    rows.map((r) => [r.division, Number(r.players)]),
  )
  return DIVISIONS.map((d) => ({
    division: d,
    players: counts.get(d.name) ?? 0,
  }))
}

/** Сезонный профиль игрока: MMR, дивизион, ранг в таблице, титулы. */
export async function getSeasonProfile(
  userId: number,
): Promise<SeasonProfile> {
  // mmrRows and titleRows are independent (both keyed only by userId) → run
  // concurrently. rankRows is NOT independent: it filters on `season_mmr > $1`
  // where $1 is the seasonMmr derived from mmrRows, so it must run after.
  const [mmrRows, titleRows] = await Promise.all([
    query<{ season_mmr: number }>(
      `SELECT season_mmr FROM users WHERE user_id = $1`,
      [userId],
    ),
    query<{ code: string }>(
      `SELECT code FROM season_titles WHERE player_id = $1 ORDER BY awarded_at DESC`,
      [userId],
    ),
  ])
  const seasonMmr = mmrRows[0]?.season_mmr ?? 0

  const rankRows = await query<{ rank: number }>(
    `SELECT COUNT(*) + 1 AS rank
       FROM users
      WHERE season_mmr > $1`,
    [seasonMmr],
  )
  const rank = seasonMmr > 0 ? Number(rankRows[0]?.rank ?? 0) : null

  return {
    seasonMmr,
    division: getDivision(seasonMmr),
    rank,
    titles: titleRows.map((t) => t.code),
  }
}

// --- Админ-действия ---------------------------------------------------------

/** Стартует новый сезон. Деактивирует прочие. Возвращает id. */
export async function startSeason(name: string): Promise<number> {
  const rows = await query<{ id: number }>(
    `WITH deactivate AS (
        UPDATE seasons SET is_active = false WHERE is_active = true
        RETURNING 1
     )
     INSERT INTO seasons (name, started_at, ends_at, is_active)
     VALUES ($1, now(), now() + ($2 || ' days')::interval, true)
     RETURNING id`,
    [name, String(SEASON_LENGTH_DAYS)],
  )
  return rows[0].id
}

export interface FinalizeWinner {
  userId: number
  rank: number
  seasonMmr: number
  division: string
  titles: string[]
}

/**
 * Завершает активный сезон: начисляет ешки по дивизиону, выдаёт сезонные
 * титулы и закрывает сезон. Зеркалит логику Python `finalize_active_season`.
 * Возвращает список призёров. Все операции — в одной транзакции.
 */
export async function finalizeActiveSeason(
  topN = 50,
): Promise<FinalizeWinner[]> {
  const { withTransaction } = await import('@/lib/db')
  return withTransaction(async (client) => {
    const seasonRes = await client.query<{ id: number }>(
      `SELECT id FROM seasons WHERE is_active = true LIMIT 1 FOR UPDATE`,
    )
    if (seasonRes.rows.length === 0) return []
    const seasonId = seasonRes.rows[0].id

    const topRes = await client.query<{ user_id: number; season_mmr: number }>(
      `SELECT user_id, season_mmr FROM users
        WHERE season_mmr > 0 ORDER BY season_mmr DESC LIMIT $1`,
      [topN],
    )

    const titleDefs: { code: string; condition: string }[] = [
      { code: 's1_champion', condition: 'rank:1' },
      { code: 's1_top3', condition: 'rank:3' },
      { code: 's1_master', condition: 'division:Master' },
      { code: 's1_diamond', condition: 'division:Diamond' },
    ]

    const winners: FinalizeWinner[] = []

    for (let i = 0; i < topRes.rows.length; i++) {
      const row = topRes.rows[i]
      const rank = i + 1
      const division = getDivision(row.season_mmr)

      // 1. Награда ешками по дивизиону (productive reason 'season_reward').
      if (division.rewardEshki > 0) {
        await client.query(
          `UPDATE users
              SET balance = balance + $1,
                  total_earned = total_earned + $1
            WHERE user_id = $2`,
          [division.rewardEshki, row.user_id],
        )
        await client.query(
          `INSERT INTO transactions (user_id, amount, reason, meta)
           VALUES ($1, $2, 'season_reward', $3::jsonb)`,
          [
            row.user_id,
            division.rewardEshki,
            JSON.stringify({ season_id: seasonId, division: division.name, rank }),
          ],
        )
      }

      // 2. Сезонные титулы по условиям.
      const titles: string[] = []
      for (const t of titleDefs) {
        const [kind, value] = t.condition.split(':')
        const ok =
          (kind === 'rank' && rank <= Number(value)) ||
          (kind === 'division' && division.name === value)
        if (ok) {
          await client.query(
            `INSERT INTO season_titles (season_id, player_id, code)
             VALUES ($1, $2, $3)
             ON CONFLICT (season_id, player_id, code) DO NOTHING`,
            [seasonId, row.user_id, t.code],
          )
          titles.push(t.code)
        }
      }

      if (division.rewardEshki > 0 || titles.length > 0) {
        winners.push({
          userId: row.user_id,
          rank,
          seasonMmr: row.season_mmr,
          division: division.name,
          titles,
        })
      }
    }

    await client.query(
      `UPDATE seasons SET is_active = false, finalized_at = now() WHERE id = $1`,
      [seasonId],
    )

    return winners
  })
}

/** Человекочитаемые названия сезонных титулов (для UI). */
export const TITLE_LABELS: Record<string, string> = {
  s1_champion: '🏆 Чемпион Сезона 1',
  s1_top3: '🥇 Призёр Сезона 1',
  s1_master: '🏅 Master S1',
  s1_diamond: '💎 Diamond S1',
}
