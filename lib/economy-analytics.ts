import { query } from '@/lib/db'
import { safeScalar } from '@/lib/admin-stats'

/**
 * Economic Control Center — read-only analytics over the data the bot already
 * writes. NOTHING here mutates state. Every loader degrades gracefully (returns
 * null / [] / zeros) when a table or column is missing on the target DB, so the
 * pages never 500 on an un-migrated deployment.
 *
 * Source of truth (bot-owned tables):
 *   - transactions(amount signed, reason, meta JSONB, created_at) — the ledger.
 *   - case_openings(case_item_code, reward_kind, amount, ...) — case ledger.
 *   - gift_catalog(star_cost, price_eshki, sold_count, ...) — gifts catalog.
 *   - users(balance) — current eshki balances.
 *
 * Honest gaps (see VOZNYA audit): item rewards have no eshki value, so case EV
 * covers only the currency portion; gift sales/fund are zero until the purchase
 * flow ships; case_openings.transaction_id is not yet populated.
 */

const NUM = (v: string | null | undefined): number => (v == null ? 0 : Number(v))

/** Run a query that returns rows; [] if the table/columns are missing. */
async function safeRows<T>(sql: string, params?: unknown[]): Promise<T[]> {
  try {
    return await query<T>(sql, params)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 1. Economy Dashboard
// ---------------------------------------------------------------------------

export type EconomyOverview = {
  totalEshki: number | null
  players: number | null
  activePlayers7d: number | null
  avgBalance: number | null
  mintedToday: number | null
  burnedToday: number | null
  netToday: number | null
}

export async function loadEconomyOverview(): Promise<EconomyOverview> {
  const [
    totalEshki,
    players,
    activePlayers7d,
    avgBalance,
    mintedToday,
    burnedToday,
  ] = await Promise.all([
    safeScalar('SELECT COALESCE(SUM(balance), 0)::text AS v FROM users'),
    safeScalar('SELECT COUNT(*)::text AS v FROM users'),
    safeScalar(
      `SELECT COUNT(DISTINCT user_id)::text AS v FROM transactions
        WHERE created_at >= now() - interval '7 days'`,
    ),
    safeScalar('SELECT COALESCE(ROUND(AVG(balance)), 0)::text AS v FROM users'),
    safeScalar(
      `SELECT COALESCE(SUM(amount), 0)::text AS v FROM transactions
        WHERE amount > 0 AND created_at >= date_trunc('day', now())`,
    ),
    safeScalar(
      `SELECT COALESCE(SUM(-amount), 0)::text AS v FROM transactions
        WHERE amount < 0 AND created_at >= date_trunc('day', now())`,
    ),
  ])

  const netToday =
    mintedToday == null || burnedToday == null
      ? null
      : mintedToday - burnedToday

  return {
    totalEshki,
    players,
    activePlayers7d,
    avgBalance,
    mintedToday,
    burnedToday,
    netToday,
  }
}

export type DailyFlow = {
  day: string
  minted: number
  burned: number
  net: number
}

/** Per-day minted / burned / net over the last `days` days. */
export async function loadDailyFlow(days = 14): Promise<DailyFlow[]> {
  const rows = await safeRows<{
    day: string
    minted: string | null
    burned: string | null
  }>(
    `SELECT date_trunc('day', created_at)::date::text AS day,
            COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::text  AS minted,
            COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0)::text AS burned
       FROM transactions
      WHERE created_at >= date_trunc('day', now()) - ($1::int - 1) * interval '1 day'
      GROUP BY 1
      ORDER BY 1 DESC`,
    [days],
  )
  return rows.map((r) => {
    const minted = NUM(r.minted)
    const burned = NUM(r.burned)
    return { day: r.day, minted, burned, net: minted - burned }
  })
}

export type SourceFlow = {
  reason: string
  minted: number
  burned: number
  net: number
  count: number
}

/** Minted/burned grouped by transaction reason (source) over `days` days. */
export async function loadFlowBySource(days = 30): Promise<SourceFlow[]> {
  const rows = await safeRows<{
    reason: string
    minted: string | null
    burned: string | null
    count: string | null
  }>(
    `SELECT reason,
            COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::text  AS minted,
            COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0)::text AS burned,
            COUNT(*)::text AS count
       FROM transactions
      WHERE created_at >= now() - ($1::int) * interval '1 day'
      GROUP BY reason
      ORDER BY (COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)
              + COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0)) DESC`,
    [days],
  )
  return rows.map((r) => {
    const minted = NUM(r.minted)
    const burned = NUM(r.burned)
    return {
      reason: r.reason,
      minted,
      burned,
      net: minted - burned,
      count: NUM(r.count),
    }
  })
}

// ---------------------------------------------------------------------------
// 2. Cases Analytics
// ---------------------------------------------------------------------------

export type CaseStat = {
  caseCode: string
  name: string | null
  openings: number
  eshkiGranted: number // currency rewards paid out
  itemValueGranted: number // estimated eshki value of item rewards (ref_value)
  itemRewardsUnpriced: number // item-reward openings with NULL ref_value
  eshkiBurned: number // open-cost debited (reason=purchase, source=case_open)
  net: number // burned - (granted + itemValue): positive = house edge
  avgGrantedPerOpen: number | null // currency-only EV; null if no openings
  avgFullEvPerOpen: number | null // (currency + item value) EV; null if no openings
}

/**
 * Per-case economy. Openings + granted come from case_openings; burned comes
 * from the ledger (transactions reason='purchase', meta.source='case_open',
 * meta.case=<item_code>). Item-reward value is estimated from
 * inventory_items.ref_value (migration 0019). The three are merged in JS by
 * case code.
 *
 * Caveat: item rewards with NULL ref_value are not priced (counted in
 * itemRewardsUnpriced) — full EV is exact only when all dropped items are valued.
 */
export async function loadCaseStats(): Promise<CaseStat[]> {
  const [openings, items, burns, names] = await Promise.all([
    safeRows<{
      case_code: string
      openings: string
      granted: string | null
    }>(
      `SELECT case_item_code AS case_code,
              COUNT(*)::text AS openings,
              COALESCE(SUM(amount) FILTER (WHERE reward_kind = 'currency'), 0)::text AS granted
         FROM case_openings
        GROUP BY case_item_code`,
    ),
    safeRows<{
      case_code: string
      item_value: string | null
      unpriced: string | null
    }>(
      `SELECT o.case_item_code AS case_code,
              COALESCE(SUM(o.qty * i.ref_value) FILTER (WHERE i.ref_value IS NOT NULL), 0)::text AS item_value,
              COUNT(*) FILTER (WHERE o.reward_kind = 'item' AND (i.ref_value IS NULL OR i.code IS NULL))::text AS unpriced
         FROM case_openings o
         LEFT JOIN inventory_items i ON i.code = o.reward_item_code
        WHERE o.reward_kind = 'item'
        GROUP BY o.case_item_code`,
    ),
    safeRows<{ case_code: string; burned: string | null }>(
      `SELECT meta->>'case' AS case_code,
              COALESCE(SUM(-amount), 0)::text AS burned
         FROM transactions
        WHERE reason = 'purchase'
          AND meta->>'source' = 'case_open'
          AND meta->>'case' IS NOT NULL
        GROUP BY meta->>'case'`,
    ),
    safeRows<{ item_code: string; name: string | null }>(
      `SELECT item_code, name FROM case_definitions`,
    ),
  ])

  const nameByCode = new Map(names.map((n) => [n.item_code, n.name]))
  const burnByCode = new Map(burns.map((b) => [b.case_code, NUM(b.burned)]))
  const itemByCode = new Map(
    items.map((i) => [
      i.case_code,
      { value: NUM(i.item_value), unpriced: NUM(i.unpriced) },
    ]),
  )

  const codes = new Set<string>([
    ...openings.map((o) => o.case_code),
    ...burns.map((b) => b.case_code),
    ...items.map((i) => i.case_code),
  ])

  const stats: CaseStat[] = []
  for (const code of codes) {
    const o = openings.find((x) => x.case_code === code)
    const openCount = o ? NUM(o.openings) : 0
    const granted = o ? NUM(o.granted) : 0
    const burned = burnByCode.get(code) ?? 0
    const item = itemByCode.get(code) ?? { value: 0, unpriced: 0 }
    const fullGranted = granted + item.value
    stats.push({
      caseCode: code,
      name: nameByCode.get(code) ?? null,
      openings: openCount,
      eshkiGranted: granted,
      itemValueGranted: item.value,
      itemRewardsUnpriced: item.unpriced,
      eshkiBurned: burned,
      net: burned - fullGranted,
      avgGrantedPerOpen: openCount > 0 ? Math.round(granted / openCount) : null,
      avgFullEvPerOpen:
        openCount > 0 ? Math.round(fullGranted / openCount) : null,
    })
  }
  stats.sort((a, b) => b.openings - a.openings)
  return stats
}


export type RewardDistRow = {
  caseCode: string
  rewardKind: string
  rewardItemCode: string | null
  hits: number
  share: number // 0..1 within the case
}

/** Reward distribution (actual hit counts) per case from the openings ledger. */
export async function loadRewardDistribution(): Promise<RewardDistRow[]> {
  const rows = await safeRows<{
    case_code: string
    reward_kind: string
    reward_item_code: string | null
    hits: string
  }>(
    `SELECT case_item_code AS case_code, reward_kind, reward_item_code,
            COUNT(*)::text AS hits
       FROM case_openings
      GROUP BY case_item_code, reward_kind, reward_item_code
      ORDER BY case_item_code, COUNT(*) DESC`,
  )

  const totals = new Map<string, number>()
  for (const r of rows) {
    totals.set(r.case_code, (totals.get(r.case_code) ?? 0) + NUM(r.hits))
  }

  return rows.map((r) => {
    const hits = NUM(r.hits)
    const total = totals.get(r.case_code) ?? 0
    return {
      caseCode: r.case_code,
      rewardKind: r.reward_kind,
      rewardItemCode: r.reward_item_code,
      hits,
      share: total > 0 ? hits / total : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// 3. Casino Analytics
// ---------------------------------------------------------------------------

export type CasinoOverview = {
  bets: number | null
  totalWagered: number | null
  totalPayout: number | null
  rtp: number | null // payout / wagered (0..1+)
  houseProfit: number | null // wagered - payout
}

/**
 * Casino has no dedicated table — one transaction per spin with
 * reason='casino' and meta {bet, multiplier, payout, outcome}. We reconstruct
 * everything from meta. amount = net (payout - bet), so house profit = -SUM(amount).
 */
export async function loadCasinoOverview(): Promise<CasinoOverview> {
  const rows = await safeRows<{
    bets: string
    wagered: string | null
    payout: string | null
    profit: string | null
  }>(
    `SELECT COUNT(*)::text AS bets,
            COALESCE(SUM((meta->>'bet')::bigint), 0)::text    AS wagered,
            COALESCE(SUM((meta->>'payout')::bigint), 0)::text AS payout,
            COALESCE(SUM(-amount), 0)::text AS profit
       FROM transactions
      WHERE reason = 'casino'
        AND meta ? 'bet' AND meta ? 'payout'`,
  )
  if (rows.length === 0) {
    return { bets: null, totalWagered: null, totalPayout: null, rtp: null, houseProfit: null }
  }
  const r = rows[0]
  const wagered = NUM(r.wagered)
  const payout = NUM(r.payout)
  return {
    bets: NUM(r.bets),
    totalWagered: wagered,
    totalPayout: payout,
    rtp: wagered > 0 ? payout / wagered : null,
    houseProfit: NUM(r.profit),
  }
}

export type CasinoExtreme = {
  userId: number
  userName: string | null
  net: number
  bet: number
  payout: number
  outcome: string | null
  createdAt: string
}

/** Top casino swings by net amount. dir='win' → biggest wins, 'loss' → biggest losses. */
export async function loadCasinoExtremes(
  dir: 'win' | 'loss',
  limit = 5,
): Promise<CasinoExtreme[]> {
  const order = dir === 'win' ? 'DESC' : 'ASC'
  const rows = await safeRows<{
    user_id: number
    user_name: string | null
    net: string
    bet: string | null
    payout: string | null
    outcome: string | null
    created_at: string
  }>(
    `SELECT t.user_id, u.first_name AS user_name,
            t.amount::text AS net,
            (t.meta->>'bet')    AS bet,
            (t.meta->>'payout') AS payout,
            (t.meta->>'outcome') AS outcome,
            t.created_at
       FROM transactions t
       LEFT JOIN users u ON u.user_id = t.user_id
      WHERE t.reason = 'casino' AND t.meta ? 'bet'
      ORDER BY t.amount ${order}
      LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({
    userId: r.user_id,
    userName: r.user_name,
    net: NUM(r.net),
    bet: NUM(r.bet),
    payout: NUM(r.payout),
    outcome: r.outcome,
    createdAt: r.created_at,
  }))
}

// ---------------------------------------------------------------------------
// 4. Gifts Analytics
// ---------------------------------------------------------------------------

export type GiftCatalogRow = {
  code: string
  name: string
  starCost: number
  priceEshki: number
  stock: number | null
  soldCount: number
  isActive: boolean
}

export type GiftsOverview = {
  catalog: GiftCatalogRow[]
  activeCount: number
  estStarCostBasis: number // Σ star_cost over active items (per-unit budget)
  giftsSold: number // Σ sold_count (realized deliveries)
  // --- real economics from purchase_history + gift_transactions ----------
  revenueEshki: number // Σ purchase_history.price (source='gift'), net of refunds
  purchasesCount: number // gift purchases (net of refunds)
  starsSpentRealized: number // Σ star_cost over completed deliveries (real Stars cost)
  marginEshki: number // revenue − Σ(star_cost*10) over completed (наценка)
  // delivery funnel
  pending: number
  completed: number
  cancelled: number
  // --- Stars fund (from stars_ledger) ------------------------------------
  starsIn: number // Σ Stars topped up / donated to the bot
  starsOut: number // Σ Stars spent (gift_send etc.)
  fundBalance: number | null // starsIn − starsOut (our books); null if no ledger
}

/**
 * Gifts economics — real numbers from the ledgers the bot writes:
 *   - revenue/purchases: purchase_history (source='gift'), refunds flagged in meta;
 *   - delivery funnel + realized Stars cost: gift_transactions (kind='tg_gift');
 *   - Stars fund balance: stars_ledger (in − out) — our books, reconcilable with
 *     getMyStarBalance. Null only if stars_ledger is not migrated yet.
 */
export async function loadGiftsOverview(): Promise<GiftsOverview> {
  const [catalog, purchaseAgg, deliveryAgg, starsAgg] = await Promise.all([

    safeRows<{
      code: string
      name: string
      star_cost: number
      price_eshki: string
      stock: number | null
      sold_count: number
      is_active: boolean
    }>(
      `SELECT code, name, star_cost, price_eshki::text AS price_eshki,
              stock, sold_count, is_active
         FROM gift_catalog
        ORDER BY is_active DESC, sort_order, name`,
    ),
    safeRows<{ revenue: string | null; purchases: string | null }>(
      `SELECT COALESCE(SUM(price), 0)::text AS revenue,
              COUNT(*)::text AS purchases
         FROM purchase_history
        WHERE source = 'gift'
          AND COALESCE(meta->>'refunded', 'false') <> 'true'`,
    ),
    safeRows<{
      status: string
      cnt: string
      stars: string | null
    }>(
      `SELECT status,
              COUNT(*)::text AS cnt,
              COALESCE(SUM((meta->>'star_cost')::bigint), 0)::text AS stars
         FROM gift_transactions
        WHERE kind = 'tg_gift'
        GROUP BY status`,
    ),
    safeRows<{ direction: string; stars: string | null }>(
      `SELECT direction, COALESCE(SUM(amount_stars), 0)::text AS stars
         FROM stars_ledger
        GROUP BY direction`,
    ),
  ])


  const rows: GiftCatalogRow[] = catalog.map((g) => ({
    code: g.code,
    name: g.name,
    starCost: Number(g.star_cost),
    priceEshki: NUM(g.price_eshki),
    stock: g.stock,
    soldCount: Number(g.sold_count),
    isActive: g.is_active,
  }))

  const activeCount = rows.filter((r) => r.isActive).length
  const estStarCostBasis = rows
    .filter((r) => r.isActive)
    .reduce((s, r) => s + r.starCost, 0)
  const giftsSold = rows.reduce((s, r) => s + r.soldCount, 0)

  const revenueEshki = NUM(purchaseAgg[0]?.revenue)
  const purchasesCount = NUM(purchaseAgg[0]?.purchases)

  const byStatus = new Map(
    deliveryAgg.map((r) => [r.status, { cnt: NUM(r.cnt), stars: NUM(r.stars) }]),
  )
  const completed = byStatus.get('completed')?.cnt ?? 0
  const pending = byStatus.get('pending')?.cnt ?? 0
  const cancelled = byStatus.get('cancelled')?.cnt ?? 0
  // Realized Stars cost = star_cost over completed deliveries (gift truly sent).
  const starsSpentRealized = byStatus.get('completed')?.stars ?? 0
  // Margin in eshki: revenue − cost-basis (star_cost*10) of completed deliveries.
  const marginEshki = revenueEshki - starsSpentRealized * 10

  // Stars fund from our books (stars_ledger). If the table is missing, starsAgg
  // is [] → starsIn/out = 0 and we expose fundBalance=null (no ledger yet).
  const hasLedger = starsAgg.length > 0
  const dirMap = new Map(starsAgg.map((r) => [r.direction, NUM(r.stars)]))
  const starsIn = dirMap.get('in') ?? 0
  const starsOut = dirMap.get('out') ?? 0
  const fundBalance = hasLedger ? starsIn - starsOut : null

  return {
    catalog: rows,
    activeCount,
    estStarCostBasis,
    giftsSold,
    revenueEshki,
    purchasesCount,
    starsSpentRealized,
    marginEshki,
    pending,
    completed,
    cancelled,
    starsIn,
    starsOut,
    fundBalance,
  }
}

// ---------------------------------------------------------------------------
// 5. Per-case live drop stats (Admin V2 P0 — /admin/cases)
// ---------------------------------------------------------------------------

/**
 * Live per-case drop counters over the `case_openings` ledger. Complements
 * loadCaseStats (openings/granted/EV) with: today vs all-time, Premium /
 * limited / jackpot drops, eshki spent and actual currency RTP. Read-only,
 * degrades to an empty Map.
 *
 * Classification: Premium = reward_item_code in (gift_premium_3m/6m); jackpot =
 * rolled case_reward.is_jackpot; limited = inventory_items.is_limited.
 * Eshki spent = openings × currency open-cost. RTP = currency returned ÷ spent.
 */
export type CaseLiveStats = {
  caseCode: string
  openingsToday: number
  openingsTotal: number
  eshkiSpent: number
  premiumDrops: number
  limitedDrops: number
  jackpotDrops: number
  currencyReturned: number
  actualRtp: number | null
}

export async function loadCaseLiveStats(): Promise<Map<string, CaseLiveStats>> {
  const rows = await safeRows<{
    case_code: string
    openings_today: string
    openings_total: string
    premium_drops: string
    limited_drops: string
    jackpot_drops: string
    currency_returned: string
  }>(
    `SELECT o.case_item_code AS case_code,
            COUNT(*) FILTER (WHERE o.created_at >= now() - interval '24 hours')::text
              AS openings_today,
            COUNT(*)::text AS openings_total,
            COUNT(*) FILTER (
              WHERE o.reward_item_code IN ('gift_premium_3m', 'gift_premium_6m')
            )::text AS premium_drops,
            COUNT(*) FILTER (WHERE i.is_limited)::text AS limited_drops,
            COUNT(*) FILTER (WHERE r.is_jackpot)::text AS jackpot_drops,
            COALESCE(
              SUM(o.amount) FILTER (WHERE o.reward_kind = 'currency'), 0
            )::text AS currency_returned
       FROM case_openings o
       LEFT JOIN case_rewards r ON r.id = o.reward_id
       LEFT JOIN inventory_items i ON i.code = o.reward_item_code
      GROUP BY o.case_item_code`,
  )

  const costRows = await safeRows<{ case_code: string; cost: string }>(
    `SELECT item_code AS case_code,
            (CASE WHEN open_cost_kind = 'currency'
                  THEN open_cost_amount ELSE 0 END)::text AS cost
       FROM case_definitions`,
  )
  const costByCase = new Map(costRows.map((r) => [r.case_code, NUM(r.cost)]))

  const out = new Map<string, CaseLiveStats>()
  for (const r of rows) {
    const openingsTotal = NUM(r.openings_total)
    const cost = costByCase.get(r.case_code) ?? 0
    const eshkiSpent = openingsTotal * cost
    const currencyReturned = NUM(r.currency_returned)
    const actualRtp = eshkiSpent > 0 ? currencyReturned / eshkiSpent : null
    out.set(r.case_code, {
      caseCode: r.case_code,
      openingsToday: NUM(r.openings_today),
      openingsTotal,
      eshkiSpent,
      premiumDrops: NUM(r.premium_drops),
      limitedDrops: NUM(r.limited_drops),
      jackpotDrops: NUM(r.jackpot_drops),
      currencyReturned,
      actualRtp,
    })
  }
  return out
}

export type NotableDrop = {
  caseCode: string
  userId: string
  rewardKind: string
  rewardItemCode: string | null
  rewardItemName: string | null
  amount: number | null
  qty: number
  isJackpot: boolean
  isLimited: boolean
  createdAt: string
}

/** Biggest single currency drops across all cases. Read-only, [] on missing. */
export async function loadBiggestDrops(limit = 10): Promise<NotableDrop[]> {
  const rows = await safeRows<{
    case_code: string
    user_id: string
    reward_kind: string
    reward_item_code: string | null
    reward_item_name: string | null
    amount: string | null
    qty: number
    is_jackpot: boolean | null
    is_limited: boolean | null
    created_at: string
  }>(
    `SELECT o.case_item_code AS case_code, o.user_id::text AS user_id,
            o.reward_kind, o.reward_item_code,
            i.name AS reward_item_name, o.amount::text AS amount, o.qty,
            r.is_jackpot, i.is_limited, o.created_at
       FROM case_openings o
       LEFT JOIN case_rewards r ON r.id = o.reward_id
       LEFT JOIN inventory_items i ON i.code = o.reward_item_code
      WHERE o.reward_kind = 'currency'
      ORDER BY o.amount DESC NULLS LAST
      LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({
    caseCode: r.case_code,
    userId: r.user_id,
    rewardKind: r.reward_kind,
    rewardItemCode: r.reward_item_code,
    rewardItemName: r.reward_item_name,
    amount: r.amount == null ? null : NUM(r.amount),
    qty: r.qty,
    isJackpot: Boolean(r.is_jackpot),
    isLimited: Boolean(r.is_limited),
    createdAt: r.created_at,
  }))
}

/** Latest notable drops (premium / limited / jackpot). Read-only, [] on missing. */
export async function loadLatestDrops(limit = 15): Promise<NotableDrop[]> {
  const rows = await safeRows<{
    case_code: string
    user_id: string
    reward_kind: string
    reward_item_code: string | null
    reward_item_name: string | null
    amount: string | null
    qty: number
    is_jackpot: boolean | null
    is_limited: boolean | null
    created_at: string
  }>(
    `SELECT o.case_item_code AS case_code, o.user_id::text AS user_id,
            o.reward_kind, o.reward_item_code,
            i.name AS reward_item_name, o.amount::text AS amount, o.qty,
            r.is_jackpot, i.is_limited, o.created_at
       FROM case_openings o
       LEFT JOIN case_rewards r ON r.id = o.reward_id
       LEFT JOIN inventory_items i ON i.code = o.reward_item_code
      WHERE r.is_jackpot = true
         OR i.is_limited = true
         OR o.reward_item_code IN ('gift_premium_3m', 'gift_premium_6m')
      ORDER BY o.created_at DESC
      LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({
    caseCode: r.case_code,
    userId: r.user_id,
    rewardKind: r.reward_kind,
    rewardItemCode: r.reward_item_code,
    rewardItemName: r.reward_item_name,
    amount: r.amount == null ? null : NUM(r.amount),
    qty: r.qty,
    isJackpot: Boolean(r.is_jackpot),
    isLimited: Boolean(r.is_limited),
    createdAt: r.created_at,
  }))
}




