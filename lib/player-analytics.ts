import type { QueryResultRow } from 'pg'
import { query } from '@/lib/db'


/**
 * Player diagnostics — read-only aggregates over the ledgers the bot writes,
 * for the admin player card (Admin V2 P0). NOTHING here mutates state. Every
 * loader degrades gracefully (null / [] / zeros) when a table or column is
 * missing, so the card never 500s on an un-migrated deployment.
 *
 * Sources: case_openings, transactions (reason/meta), purchase_history,
 * gift_transactions, stars_ledger, inventory_items, case_rewards.
 */

const NUM = (v: string | null | undefined): number => (v == null ? 0 : Number(v))

async function safeRows<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {

  try {
    return await query<T>(sql, params)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Quick diagnostic metrics (the "top of card" answers support needs most)
// ---------------------------------------------------------------------------

export type PlayerDiagnostics = {
  casesOpened: number
  premiumWon: number
  limitedWon: number
  jackpotsWon: number
  casinoBets: number
  casinoWon: number // gross eshki won across winning spins (net positive amounts)
  casinoLost: number // gross eshki lost across losing spins (net negative amounts)
  shopSpent: number // Σ purchase_history.price (source='gift'), net of refunds
  transactionsCount: number
  starsBalance: number | null // per-user Stars net from stars_ledger; null if none
}

export async function loadPlayerDiagnostics(
  userId: number,
): Promise<PlayerDiagnostics> {
  const [cases, casino, shop, txCount, stars] = await Promise.all([
    safeRows<{
      opened: string
      premium: string
      limited: string
      jackpots: string
    }>(
      `SELECT COUNT(*)::text AS opened,
              COUNT(*) FILTER (
                WHERE o.reward_item_code IN ('gift_premium_3m', 'gift_premium_6m')
              )::text AS premium,
              COUNT(*) FILTER (WHERE i.is_limited)::text AS limited,
              COUNT(*) FILTER (WHERE r.is_jackpot)::text AS jackpots
         FROM case_openings o
         LEFT JOIN case_rewards r ON r.id = o.reward_id
         LEFT JOIN inventory_items i ON i.code = o.reward_item_code
        WHERE o.user_id = $1`,
      [userId],
    ),
    safeRows<{ bets: string; won: string; lost: string }>(
      `SELECT COUNT(*)::text AS bets,
              COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::text AS won,
              COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0)::text AS lost
         FROM transactions
        WHERE reason = 'casino' AND user_id = $1 AND meta ? 'bet'`,
      [userId],
    ),
    safeRows<{ spent: string }>(
      `SELECT COALESCE(SUM(price), 0)::text AS spent
         FROM purchase_history
        WHERE user_id = $1 AND source = 'gift'
          AND COALESCE(meta->>'refunded', 'false') <> 'true'`,
      [userId],
    ),
    safeRows<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM transactions WHERE user_id = $1`,
      [userId],
    ),
    safeRows<{ net: string }>(
      `SELECT COALESCE(
                SUM(CASE WHEN direction = 'in' THEN amount_stars
                         ELSE -amount_stars END), 0)::text AS net
         FROM stars_ledger WHERE user_id = $1`,
      [userId],
    ),
  ])

  const c = cases[0]
  const cas = casino[0]
  return {
    casesOpened: NUM(c?.opened),
    premiumWon: NUM(c?.premium),
    limitedWon: NUM(c?.limited),
    jackpotsWon: NUM(c?.jackpots),
    casinoBets: NUM(cas?.bets),
    casinoWon: NUM(cas?.won),
    casinoLost: NUM(cas?.lost),
    shopSpent: NUM(shop[0]?.spent),
    transactionsCount: NUM(txCount[0]?.cnt),
    starsBalance: stars.length > 0 ? NUM(stars[0]?.net) : null,
  }
}

// ---------------------------------------------------------------------------
// Unified activity feed (one timeline, filterable on the client)
// ---------------------------------------------------------------------------

export type ActivityCategory =
  | 'case'
  | 'economy'
  | 'casino'
  | 'gift'
  | 'premium'
  | 'admin'

export type ActivityEvent = {
  id: string
  category: ActivityCategory
  title: string
  detail: string
  amount: number | null // signed eshki where relevant
  createdAt: string
}

/**
 * Builds a single chronological feed from the bot's ledgers. We pull a bounded
 * slice from each source, tag it with a category, then merge + sort in JS and
 * cap to `limit`. Read-only; missing tables contribute nothing.
 */
export async function loadPlayerActivity(
  userId: number,
  limit = 60,
): Promise<ActivityEvent[]> {
  const [cases, txs, gifts] = await Promise.all([
    // Case openings → category 'case'.
    safeRows<{
      id: string
      case_name: string | null
      case_code: string
      reward_kind: string
      reward_item_code: string | null
      reward_name: string | null
      amount: string | null
      qty: number
      is_premium: boolean | null
      created_at: string
    }>(
      `SELECT o.id::text AS id, cd.name AS case_name, o.case_item_code AS case_code,
              o.reward_kind, o.reward_item_code, ii.name AS reward_name,
              o.amount::text AS amount, o.qty,
              (o.reward_item_code IN ('gift_premium_3m', 'gift_premium_6m')) AS is_premium,
              o.created_at
         FROM case_openings o
         LEFT JOIN case_definitions cd ON cd.item_code = o.case_item_code
         LEFT JOIN inventory_items ii ON ii.code = o.reward_item_code
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2`,
      [userId, limit],
    ),
    // Transactions → category depends on reason (casino / admin / economy).
    safeRows<{
      id: string
      reason: string
      amount: string
      meta_source: string | null
      meta_outcome: string | null
      created_at: string
    }>(
      `SELECT t.id::text AS id, t.reason, t.amount::text AS amount,
              t.meta->>'source' AS meta_source,
              t.meta->>'outcome' AS meta_outcome,
              t.created_at
         FROM transactions t
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2`,
      [userId, limit],
    ),
    // Gift deliveries → category 'gift' (Premium gifts tagged 'premium').
    safeRows<{
      id: string
      item_code: string
      gift_name: string | null
      status: string
      created_at: string
    }>(
      `SELECT gt.idempotency_key AS id, gt.item_code,
              gc.name AS gift_name, gt.status, gt.created_at
         FROM gift_transactions gt
         LEFT JOIN gift_catalog gc ON gc.code = gt.item_code
        WHERE gt.kind = 'tg_gift' AND gt.recipient_user_id = $1
        ORDER BY gt.created_at DESC
        LIMIT $2`,
      [userId, limit],
    ),
  ])

  const events: ActivityEvent[] = []

  for (const o of cases) {
    const reward =
      o.reward_kind === 'currency'
        ? `${NUM(o.amount).toLocaleString('ru-RU')} ешек`
        : `${o.reward_name ?? o.reward_item_code ?? 'предмет'}${o.qty > 1 ? ` ×${o.qty}` : ''}`
    events.push({
      id: `case-${o.id}`,
      category: o.is_premium ? 'premium' : 'case',
      title: `Кейс: ${o.case_name ?? o.case_code}`,
      detail: `→ ${reward}`,
      amount: o.reward_kind === 'currency' ? NUM(o.amount) : null,
      createdAt: o.created_at,
    })
  }

  for (const t of txs) {
    let category: ActivityCategory = 'economy'
    let title = t.reason
    if (t.reason === 'casino') {
      category = 'casino'
      title = t.meta_outcome ? `Казино: ${t.meta_outcome}` : 'Казино'
    } else if (t.reason === 'admin' || t.meta_source === 'admin') {
      category = 'admin'
      title = 'Админ-операция'
    } else if (t.meta_source === 'case_open') {
      // Skip: the case opening itself is already in the feed from case_openings.
      continue
    } else {
      title = `Экономика: ${t.reason}`
    }
    events.push({
      id: `tx-${t.id}`,
      category,
      title,
      detail: '',
      amount: NUM(t.amount),
      createdAt: t.created_at,
    })
  }

  for (const g of gifts) {
    const isPremium = g.item_code === 'gift_premium_3m' || g.item_code === 'gift_premium_6m'
    events.push({
      id: `gift-${g.id}`,
      category: isPremium ? 'premium' : 'gift',
      title: isPremium ? 'Premium' : 'Подарок',
      detail: `${g.gift_name ?? g.item_code} · ${g.status}`,
      amount: null,
      createdAt: g.created_at,
    })
  }

  events.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  return events.slice(0, limit)
}

// ---------------------------------------------------------------------------
// Message activity (moderation context: how active / how quiet is this player)
// ---------------------------------------------------------------------------

export type PlayerMessageActivity = {
  // Lifetime total = users.messages_count + combot history (parity with ratings).
  total: number
  last7: number
  last30: number
  activeDays30: number // distinct days with at least one message in the last 30
  // Per-day counts for the last 14 days (oldest → newest), for a sparkline.
  recent: { day: string; count: number }[]
}

/**
 * Read-only message activity for a player, used by the moderation context on
 * the admin player card. Combines `users.messages_count` + `combot_user_stats`
 * (lifetime, matching the ratings page) with per-day `message_daily` rows for
 * recent-window figures. Degrades to zeros on an un-migrated DB.
 */
export async function loadPlayerMessageActivity(
  userId: number,
): Promise<PlayerMessageActivity> {
  const [totals, windows, daily] = await Promise.all([
    safeRows<{ total: string }>(
      `SELECT (u.messages_count + COALESCE(c.messages, 0))::text AS total
         FROM users u
         LEFT JOIN combot_user_stats c ON c.user_id = u.user_id
        WHERE u.user_id = $1`,
      [userId],
    ),
    safeRows<{ last7: string; last30: string; active_days: string }>(
      `SELECT
          COALESCE(SUM(count) FILTER (WHERE day >= CURRENT_DATE - 6), 0)::text  AS last7,
          COALESCE(SUM(count) FILTER (WHERE day >= CURRENT_DATE - 29), 0)::text AS last30,
          COUNT(DISTINCT day) FILTER (WHERE day >= CURRENT_DATE - 29 AND count > 0)::text AS active_days
         FROM message_daily
        WHERE user_id = $1`,
      [userId],
    ),
    safeRows<{ day: string; count: string }>(
      `SELECT day::text AS day, COALESCE(SUM(count), 0)::text AS count
         FROM message_daily
        WHERE user_id = $1 AND day >= CURRENT_DATE - 13
        GROUP BY 1 ORDER BY 1`,
      [userId],
    ),
  ])

  // Backfill the 14-day series so missing days render as 0 (not gaps).
  const byDay = new Map(daily.map((r) => [r.day, NUM(r.count)]))
  const recent: { day: string; count: number }[] = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    recent.push({ day: key.slice(5), count: byDay.get(key) ?? 0 })
  }

  return {
    total: NUM(totals[0]?.total),
    last7: NUM(windows[0]?.last7),
    last30: NUM(windows[0]?.last30),
    activeDays30: NUM(windows[0]?.active_days),
    recent,
  }
}
