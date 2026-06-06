// Server-only guard: this module talks to Postgres via `./db`. Importing it
// into a client component must fail the build, not silently bundle `pg`.
// (The MMR rank helpers re-exported below live in client-safe `./mmr`; client
// code must import them from `@/lib/mmr` directly.)
import 'server-only'

import { query } from './db'
import { ACHIEVEMENTS } from './voznya-bot'
import { MMR_RANKS, mmrRank, type MmrRank } from './mmr'


// Re-export display-only MMR rank helpers so existing server-side imports
// (`from '@/lib/queries'`) keep working. The actual definitions live in
// `./mmr`, which is client-safe (no `pg`/`./db` dependency). Client components
// must import them from `@/lib/mmr` directly to avoid pulling the database
// layer into the browser bundle.
export { MMR_RANKS, mmrRank }
export type { MmrRank }


function displayName(first_name: string | null, username: string | null): string {
  if (first_name && first_name.trim()) return first_name.trim()
  if (username && username.trim()) return `@${username.replace(/^@/, '')}`
  return 'Аноним'
}

export type CommunityStats = {
  users: number
  eshInCirculation: number
  achievements: number
  duels: number
  farmers: number
  treasuresFound: number
  marriages: number
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const rows = await query<{
    users: string
    esh: string | null
    achievements: string
    duels: string | null
    farmers: string
    treasures: string | null
    marriages: string
  }>(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COALESCE(SUM(balance), 0) FROM users) AS esh,
       (SELECT COUNT(*) FROM user_achievements) AS achievements,
       (SELECT COALESCE(SUM(duels_won), 0) FROM users) AS duels,
       (SELECT COUNT(*) FROM users WHERE last_farm_at IS NOT NULL OR max_farm_streak > 0) AS farmers,
       (SELECT COALESCE(SUM(treasures_found), 0) FROM users) AS treasures,
       (SELECT COUNT(*) FROM marriages WHERE divorced_at IS NULL) AS marriages`,
  )
  const r = rows[0]
  return {
    users: Number(r.users),
    eshInCirculation: Number(r.esh ?? 0),
    achievements: Number(r.achievements),
    duels: Number(r.duels ?? 0),
    farmers: Number(r.farmers),
    treasuresFound: Number(r.treasures ?? 0),
    marriages: Number(r.marriages),
  }
}

/**
 * Read-only existence check. Used by the auth layer to decide whether a
 * logged-in Telegram user already exists in the game. NEVER inserts — the bot
 * is the single source of truth for the `users` table.
 */
export async function userExists(userId: number): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM users WHERE user_id = $1) AS exists`,
    [userId],
  )
  return Boolean(rows[0]?.exists)
}

export type UserSummary = {
  registered: boolean
  name: string | null
  balance: number | null
  rank: number | null
}

/**
 * Read-only snapshot for the header user menu: display name, ешки balance and
 * leaderboard position. NEVER writes — the bot owns the `users` table. Returns
 * `registered: false` when the logged-in Telegram user has never played.
 */
export async function getUserSummary(userId: number): Promise<UserSummary> {
  const rows = await query<{
    first_name: string | null
    username: string | null
    balance: string
    rank: string
  }>(
    `SELECT first_name, username, balance, rank FROM (
       SELECT user_id, first_name, username, balance,
              ROW_NUMBER() OVER (ORDER BY balance DESC, user_id ASC) AS rank
         FROM users
     ) ranked
     WHERE user_id = $1`,
    [userId],
  )
  const row = rows[0]
  if (!row) {
    return { registered: false, name: null, balance: null, rank: null }
  }
  return {
    registered: true,
    name: displayName(row.first_name, row.username),
    balance: Number(row.balance),
    rank: Number(row.rank),
  }
}


export type Economy = {
  treasury: number
  avgBalance: number
  maxBalance: number

  farmers: number
  richest: { name: string; balance: number } | null
}

export async function getEconomy(): Promise<Economy> {
  const agg = await query<{
    treasury: string | null
    avg: string | null
    max: string | null
    farmers: string
  }>(
    `SELECT
       COALESCE(SUM(balance), 0) AS treasury,
       COALESCE(ROUND(AVG(balance)), 0) AS avg,
       COALESCE(MAX(balance), 0) AS max,
       (SELECT COUNT(*) FROM users WHERE last_farm_at IS NOT NULL OR max_farm_streak > 0) AS farmers
     FROM users`,
  )
  const richestRows = await query<{
    first_name: string | null
    username: string | null
    balance: string
  }>(
    `SELECT first_name, username, balance FROM users ORDER BY balance DESC LIMIT 1`,
  )
  const a = agg[0]
  const richest = richestRows[0]
  return {
    treasury: Number(a.treasury ?? 0),
    avgBalance: Number(a.avg ?? 0),
    maxBalance: Number(a.max ?? 0),
    farmers: Number(a.farmers),
    richest: richest
      ? { name: displayName(richest.first_name, richest.username), balance: Number(richest.balance) }
      : null,
  }
}

export type RichUser = {
  rank: number
  userId: number
  name: string
  balance: number
  totalEarned: number
}

export async function getTopRich(limit = 10): Promise<RichUser[]> {
  const rows = await query<{
    user_id: string
    first_name: string | null
    username: string | null
    balance: string
    total_earned: string
  }>(
    `SELECT user_id, first_name, username, balance, total_earned
       FROM users
      ORDER BY balance DESC, user_id ASC
      LIMIT $1`,
    [limit],
  )
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: Number(r.user_id),
    name: displayName(r.first_name, r.username),
    balance: Number(r.balance),
    totalEarned: Number(r.total_earned),
  }))
}

export type WeeklyEarner = {
  rank: number
  userId: number
  name: string
  earned: number
}

export async function getWeeklyTop(days = 7, limit = 10): Promise<WeeklyEarner[]> {
  const rows = await query<{
    user_id: string
    first_name: string | null
    username: string | null
    earned: string
  }>(
    `SELECT u.user_id, u.first_name, u.username, SUM(t.amount) AS earned
       FROM transactions t
       JOIN users u ON u.user_id = t.user_id
      WHERE t.amount > 0 AND t.created_at >= now() - make_interval(days => $1)
      GROUP BY u.user_id, u.first_name, u.username
      ORDER BY earned DESC
      LIMIT $2`,
    [days, limit],
  )
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: Number(r.user_id),
    name: displayName(r.first_name, r.username),
    earned: Number(r.earned),
  }))
}

export type AchievementProgress = {
  code: string
  emoji: string
  name: string
  description: string
  reward: number
  unlocked: number
}

export type AchievementsResult = {
  totalUnlocked: number
  items: AchievementProgress[]
}

export async function getAchievementsProgress(): Promise<AchievementsResult> {
  const rows = await query<{ code: string; unlocked: string }>(
    `SELECT code, COUNT(*) AS unlocked FROM user_achievements GROUP BY code`,
  )
  const counts = new Map(rows.map((r) => [r.code, Number(r.unlocked)]))
  const items = ACHIEVEMENTS.map((a) => ({
    code: a.code,
    emoji: a.emoji,
    name: a.name,
    description: a.description,
    reward: a.reward,
    unlocked: counts.get(a.code) ?? 0,
  }))
  const totalUnlocked = items.reduce((sum, a) => sum + a.unlocked, 0)
  return { totalUnlocked, items }
}

export type MessageTop = { rank: number; userId: number; name: string; count: number }
export type MessageActivityPoint = { day: string; count: number }
export type MessageStats = {
  total: number
  top: MessageTop[]
  activity: MessageActivityPoint[]
}

/**
 * Detects whether the optional Combot historical table exists yet (migration
 * 0012 + import). Cached per process — schema doesn't change at runtime.
 */
let combotTablePresent: boolean | null = null
async function hasCombotUserStats(): Promise<boolean> {
  if (combotTablePresent !== null) return combotTablePresent
  const rows = await query<{ reg: string | null }>(
    `SELECT to_regclass('combot_user_stats') AS reg`,
  )
  combotTablePresent = Boolean(rows[0]?.reg)
  return combotTablePresent
}

/**
 * Generic, process-cached check for whether a table exists. Used to guard
 * queries against tables added by newer bot migrations (reputation_entries,
 * mmr_entries, inventory) that may not be present on every deployment yet.
 * Schema doesn't change at runtime, so caching per process is safe.
 */
const tablePresence = new Map<string, boolean>()
async function tableExists(table: string): Promise<boolean> {
  const cached = tablePresence.get(table)
  if (cached !== undefined) return cached
  const rows = await query<{ reg: string | null }>(
    `SELECT to_regclass($1) AS reg`,
    [table],
  )
  const present = Boolean(rows[0]?.reg)
  tablePresence.set(table, present)
  return present
}

/**
 * Process-cached check for whether a column exists on a table. Used to read the
 * denormalized `users.mmr` projection (added by migration 0015) when present,
 * and fall back to aggregating `mmr_entries` on deployments that haven't
 * applied 0015 yet. Schema is stable at runtime, so caching is safe.
 */
const columnPresence = new Map<string, boolean>()
async function columnExists(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`
  const cached = columnPresence.get(key)
  if (cached !== undefined) return cached
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
}


/**
 * Message statistics. Relies on bot tables added in migration 0004
 * (users.messages_count and message_daily). If those don't exist yet, the
 * query throws and the API returns 503 — the UI then hides the messages block.

 *
 * When the Combot historical table is present (migration 0012 + import), every
 * message count is the UNIFIED total: current Возня count + Combot history,
 * joined directly by user_id (Combot user_id == users.user_id). No account
 * links, no mapping tables. Players without a Combot row keep their current
 * count unchanged.
 */
export async function getMessageStats(topLimit = 10, activityDays = 14): Promise<MessageStats> {
  const withCombot = await hasCombotUserStats()

  const totalRows = await query<{ total: string | null }>(
    withCombot
      ? `SELECT COALESCE(SUM(messages_count), 0)
                + COALESCE((SELECT SUM(messages) FROM combot_user_stats), 0) AS total
           FROM users`
      : `SELECT COALESCE(SUM(messages_count), 0) AS total FROM users`,
  )
  const topRows = await query<{
    user_id: string
    first_name: string | null
    username: string | null
    messages_count: string
  }>(
    withCombot
      ? `SELECT u.user_id, u.first_name, u.username,
                (u.messages_count + COALESCE(c.messages, 0)) AS messages_count
           FROM users u
           LEFT JOIN combot_user_stats c ON c.user_id = u.user_id
          WHERE (u.messages_count + COALESCE(c.messages, 0)) > 0
          ORDER BY (u.messages_count + COALESCE(c.messages, 0)) DESC, u.user_id ASC
          LIMIT $1`
      : `SELECT user_id, first_name, username, messages_count
           FROM users
          WHERE messages_count > 0
          ORDER BY messages_count DESC, user_id ASC
          LIMIT $1`,
    [topLimit],
  )

  const activityRows = await query<{ day: string; count: string }>(
    `SELECT day::text AS day, SUM(count) AS count
       FROM message_daily
      WHERE day >= CURRENT_DATE - ($1::int - 1)
      GROUP BY day
      ORDER BY day`,
    [activityDays],
  )
  return {
    total: Number(totalRows[0]?.total ?? 0),
    top: topRows.map((r, i) => ({
      rank: i + 1,
      userId: Number(r.user_id),
      name: displayName(r.first_name, r.username),
      count: Number(r.messages_count),
    })),
    activity: activityRows.map((r) => ({ day: String(r.day).slice(0, 10), count: Number(r.count) })),
  }
}

export type UserAchievement = {
  code: string
  emoji: string
  name: string
  description: string
  reward: number
  category: string
  unlockedAt: string
}

export type PlayerProfile = {
  userId: number
  username: string | null
  firstName: string
  balance: number
  totalEarned: number
  totalSpent: number
  farmStreak: number
  maxFarmStreak: number
  duelsWon: number
  duelsLost: number
  treasuresFound: number
  pidorCount: number
  farmSuccessCount: number
  casinoGamesCount: number
  createdAt: string
  // Unified message counter: current Возня count + Combot history (joined by
  // user_id). Equals the current count when no Combot row exists.
  messages: number
  // Date the player joined the chat, from Combot history. null if unknown.
  joinedAt: string | null
  achievementsUnlocked: number

  // Игровой прогресс (MMR). mmr — текущий рейтинг (SUM по mmr_entries),
  // rank — визуальный ранг по порогам (НЕ хардкод, см. mmrRank). null когда
  // система MMR ещё не развёрнута (нет таблицы mmr_entries).
  mmr: number | null
  mmrRank: MmrRank | null
  // Социальный рейтинг (репутация). null когда нет таблицы reputation_entries.
  reputation: number | null
  // Статистика инвентаря (без полного UI предметов). null когда нет таблицы
  // inventory. items — суммарное количество, uniqueItems — число видов.
  inventory: { items: number; uniqueItems: number } | null

  // Позиции в лидербордах (ROW_NUMBER по соответствующей метрике). null если
  // метрика недоступна или у игрока нет значения.
  ranks: {
    byMmr: number | null
    byReputation: number | null
    byMessages: number | null
  }

  achievements: UserAchievement[]
  rankInTop: number | null
  marriage: {
    partnerId: number
    partnerName: string
    marriedAt: string
    days: number
  } | null

  // Зарезервировано под будущую косметику (титулы/рамки/бейджи). Сейчас всегда
  // пустой объект — экипировки ещё нет. Компоненты могут безопасно читать эти
  // поля и рисовать, когда они появятся, без изменения контракта профиля.
  cosmetics: {
    title: { name: string; emoji: string | null } | null
    frame: { code: string; payload: Record<string, unknown> | null } | null
    badges: { code: string; emoji: string | null }[]
  }
}


export async function getPlayerProfile(userId: number): Promise<PlayerProfile | null> {
  const rows = await query<{
    user_id: string
    username: string | null
    first_name: string | null
    balance: string
    total_earned: string
    total_spent: string
    farm_streak: string
    max_farm_streak: string
    duels_won: string
    duels_lost: string
    treasures_found: string
    pidor_count: string
    farm_success_count: string
    casino_games_count: string
    messages_count: string
    created_at: string
  }>(
    `SELECT 
       user_id, username, first_name,
       balance, total_earned, total_spent,
       farm_streak, max_farm_streak,
       duels_won, duels_lost,
       treasures_found, pidor_count,
       farm_success_count, casino_games_count,
       messages_count,
       created_at
     FROM users
     WHERE user_id = $1`,

    [userId],
  )

  if (rows.length === 0) return null

  const user = rows[0]

  // Unified message counter + join date from Combot history (joined by
  // user_id). Guarded: if the table doesn't exist yet, historical = 0 and the
  // profile shows just the current Возня count.
  let historicalMessages = 0
  let joinedAt: string | null = null
  if (await hasCombotUserStats()) {
    const combotRows = await query<{ messages: string | null; joined_at: string | null }>(
      `SELECT messages, joined_at FROM combot_user_stats WHERE user_id = $1`,
      [userId],
    )
    if (combotRows[0]) {
      historicalMessages = Number(combotRows[0].messages ?? 0)
      joinedAt = combotRows[0].joined_at ? String(combotRows[0].joined_at) : null
    }
  }

  // Get user's unlocked achievements with details

  const achRows = await query<{ 
    code: string
    unlocked_at: string
  }>(
    `SELECT code, unlocked_at FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at DESC`,
    [userId],
  )

  const unlockedCodes = new Set(achRows.map(a => a.code))
  const achievements: UserAchievement[] = achRows
    .map(row => {
      const ach = ACHIEVEMENTS.find(a => a.code === row.code)
      if (!ach) return null
      return {
        code: ach.code,
        emoji: ach.emoji,
        name: ach.name,
        description: ach.description,
        reward: ach.reward,
        category: ach.category,
        unlockedAt: String(row.unlocked_at),
      }
    })
    .filter((a): a is UserAchievement => a !== null)

  // Get rank in top
  const rankRows = await query<{ rank: string }>(
    `SELECT rank FROM (
       SELECT user_id, ROW_NUMBER() OVER (ORDER BY balance DESC, user_id ASC) AS rank
       FROM users
     ) ranked
     WHERE user_id = $1`,
    [userId],
  )

  // Get marriage info
  const marriageRows = await query<{
    partner_id: string
    partner_first_name: string | null
    partner_username: string | null
    married_at: string
    days: string
  }>(
    `SELECT 
       CASE 
         WHEN m.user_id_1 = $1 THEN m.user_id_2
         ELSE m.user_id_1
       END AS partner_id,
       CASE 
         WHEN m.user_id_1 = $1 THEN u2.first_name
         ELSE u1.first_name
       END AS partner_first_name,
       CASE 
         WHEN m.user_id_1 = $1 THEN u2.username
         ELSE u1.username
       END AS partner_username,
       m.married_at,
       EXTRACT(DAY FROM NOW() - m.married_at) AS days
     FROM marriages m
     LEFT JOIN users u1 ON u1.user_id = m.user_id_1
     LEFT JOIN users u2 ON u2.user_id = m.user_id_2
     WHERE (m.user_id_1 = $1 OR m.user_id_2 = $1)
       AND m.divorced_at IS NULL
     LIMIT 1`,
    [userId],
  )

  const marriage = marriageRows[0]

  // --- MMR (игровой рейтинг) + место по MMR -------------------------------
  // Текущий MMR денормализован в users.mmr (миграция 0015) — читаем его и
  // считаем место в лидерборде по тому же полю (дёшево, без агрегата журнала).
  // Журнал mmr_entries остаётся источником правды/аудитом. На деплоях без 0015
  // (колонки ещё нет, но таблица журнала есть) откатываемся на SUM(amount).
  let mmr: number | null = null
  let mmrRankValue: MmrRank | null = null
  let rankByMmr: number | null = null
  if (await columnExists('users', 'mmr')) {
    const mmrRows = await query<{ mmr: string | null }>(
      `SELECT mmr FROM users WHERE user_id = $1`,
      [userId],
    )
    mmr = Number(mmrRows[0]?.mmr ?? 0)
    mmrRankValue = mmrRank(mmr)

    const posRows = await query<{ pos: string }>(
      `SELECT pos FROM (
         SELECT user_id, ROW_NUMBER() OVER (ORDER BY mmr DESC, user_id ASC) AS pos
           FROM users WHERE mmr > 0
       ) ranked WHERE user_id = $1`,
      [userId],
    )
    rankByMmr = posRows[0] ? Number(posRows[0].pos) : null
  } else if (await tableExists('mmr_entries')) {
    const mmrRows = await query<{ mmr: string | null }>(
      `SELECT COALESCE(SUM(amount), 0) AS mmr FROM mmr_entries WHERE player_id = $1`,
      [userId],
    )
    mmr = Number(mmrRows[0]?.mmr ?? 0)
    mmrRankValue = mmrRank(mmr)
    const posRows = await query<{ pos: string }>(
      `SELECT pos FROM (
         SELECT player_id, ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC, player_id ASC) AS pos
           FROM mmr_entries GROUP BY player_id
       ) ranked WHERE player_id = $1`,
      [userId],
    )
    rankByMmr = posRows[0] ? Number(posRows[0].pos) : null
  }


  // --- Репутация (социальный рейтинг) + место по репутации ----------------
  // Источник правды — журнал reputation_entries (репутация = SUM(value) по
  // получателю). Таблица появляется миграцией 0013; до неё блок скрыт (null).
  let reputation: number | null = null
  let rankByReputation: number | null = null
  if (await tableExists('reputation_entries')) {
    const repRows = await query<{ rep: string | null }>(
      `SELECT COALESCE(SUM(value), 0) AS rep FROM reputation_entries WHERE target_user_id = $1`,
      [userId],
    )
    reputation = Number(repRows[0]?.rep ?? 0)
    const posRows = await query<{ pos: string }>(
      `SELECT pos FROM (
         SELECT target_user_id, ROW_NUMBER() OVER (ORDER BY SUM(value) DESC, target_user_id ASC) AS pos
           FROM reputation_entries GROUP BY target_user_id
       ) ranked WHERE target_user_id = $1`,
      [userId],
    )
    rankByReputation = posRows[0] ? Number(posRows[0].pos) : null
  }

  // --- Инвентарь (только статистика, без UI предметов) --------------------
  // items — суммарное количество (с учётом quantity), uniqueItems — число
  // различных видов. Таблица появляется миграцией 0009; до неё блок скрыт.
  let inventory: { items: number; uniqueItems: number } | null = null
  if (await tableExists('inventory')) {
    const invRows = await query<{ items: string | null; unique_items: string }>(
      `SELECT COALESCE(SUM(quantity), 0) AS items, COUNT(*) AS unique_items
         FROM inventory WHERE user_id = $1`,
      [userId],
    )
    inventory = {
      items: Number(invRows[0]?.items ?? 0),
      uniqueItems: Number(invRows[0]?.unique_items ?? 0),
    }
  }

  // --- Место по сообщениям (единый счётчик current + Combot) --------------
  // Считаем позицию по тому же объединённому счётчику, что показываем игроку.
  let rankByMessages: number | null = null
  {
    const withCombot = await hasCombotUserStats()
    const posRows = await query<{ pos: string }>(
      withCombot
        ? `SELECT pos FROM (
             SELECT u.user_id,
                    ROW_NUMBER() OVER (
                      ORDER BY (u.messages_count + COALESCE(c.messages, 0)) DESC, u.user_id ASC
                    ) AS pos
               FROM users u
               LEFT JOIN combot_user_stats c ON c.user_id = u.user_id
              WHERE (u.messages_count + COALESCE(c.messages, 0)) > 0
           ) ranked WHERE user_id = $1`
        : `SELECT pos FROM (
             SELECT user_id, ROW_NUMBER() OVER (ORDER BY messages_count DESC, user_id ASC) AS pos
               FROM users WHERE messages_count > 0
           ) ranked WHERE user_id = $1`,
      [userId],
    )
    rankByMessages = posRows[0] ? Number(posRows[0].pos) : null
  }

  return {
    userId: Number(user.user_id),
    username: user.username,
    firstName: user.first_name || 'Аноним',
    balance: Number(user.balance),
    totalEarned: Number(user.total_earned),
    totalSpent: Number(user.total_spent),
    farmStreak: Number(user.farm_streak),
    maxFarmStreak: Number(user.max_farm_streak),
    duelsWon: Number(user.duels_won),
    duelsLost: Number(user.duels_lost),
    treasuresFound: Number(user.treasures_found),
    pidorCount: Number(user.pidor_count),
    farmSuccessCount: Number(user.farm_success_count),
    casinoGamesCount: Number(user.casino_games_count),
    createdAt: String(user.created_at),
    messages: Number(user.messages_count ?? 0) + historicalMessages,
    joinedAt,
    achievementsUnlocked: achievements.length,

    mmr,
    mmrRank: mmrRankValue,
    reputation,
    inventory,
    ranks: {
      byMmr: rankByMmr,
      byReputation: rankByReputation,
      byMessages: rankByMessages,
    },

    achievements,
    rankInTop: rankRows[0] ? Number(rankRows[0].rank) : null,
    marriage: marriage
      ? {
          partnerId: Number(marriage.partner_id),
          partnerName: displayName(marriage.partner_first_name, marriage.partner_username),
          marriedAt: String(marriage.married_at),
          days: Number(marriage.days),
        }
      : null,

    // Косметика ещё не реализована (нет экипировки). Возвращаем пустую
    // структуру-заглушку, чтобы UI мог готовить место под титулы/рамки/бейджи.
    cosmetics: {
      title: null,
      frame: null,
      badges: [],
    },
  }
}


export type Family = {
  rank: number
  user1Id: number
  user1Name: string
  user2Id: number
  user2Name: string
  marriedAt: string
  days: number
}

export async function getTopFamilies(limit = 10): Promise<Family[]> {
  const rows = await query<{
    user_id_1: string
    user_id_2: string
    f1: string | null
    u1: string | null
    f2: string | null
    u2: string | null
    married_at: string
    days: string
  }>(
    `SELECT 
       m.user_id_1, m.user_id_2,
       u1.first_name AS f1, u1.username AS u1,
       u2.first_name AS f2, u2.username AS u2,
       m.married_at,
       EXTRACT(DAY FROM NOW() - m.married_at) AS days
     FROM marriages m
     JOIN users u1 ON u1.user_id = m.user_id_1
     JOIN users u2 ON u2.user_id = m.user_id_2
     WHERE m.divorced_at IS NULL
     ORDER BY m.married_at ASC
     LIMIT $1`,
    [limit],
  )
  return rows.map((r, i) => ({
    rank: i + 1,
    user1Id: Number(r.user_id_1),
    user1Name: displayName(r.f1, r.u1),
    user2Id: Number(r.user_id_2),
    user2Name: displayName(r.f2, r.u2),
    marriedAt: String(r.married_at),
    days: Number(r.days),
  }))
}

export type Daily = {
  pidor: { name: string; date: string; count: number } | null
  para: { first: string; second: string; date: string } | null
}

export async function getDaily(): Promise<Daily> {
  const pidorRows = await query<{
    nomination_date: string
    first_name: string | null
    username: string | null
    pidor_count: number | null
  }>(
    `SELECT n.nomination_date::text AS nomination_date, u.first_name, u.username, u.pidor_count
       FROM daily_nominations n
       LEFT JOIN users u ON u.user_id = n.user_id
      WHERE n.nomination_type = 'pidor'
      ORDER BY n.nomination_date DESC
      LIMIT 1`,
  )
  const paraRows = await query<{
    nomination_date: string
    f1: string | null
    u1: string | null
    f2: string | null
    u2: string | null
  }>(
    `SELECT n.nomination_date::text AS nomination_date,
            a.first_name AS f1, a.username AS u1,
            b.first_name AS f2, b.username AS u2
       FROM daily_nominations n
       LEFT JOIN users a ON a.user_id = n.user_id
       LEFT JOIN users b ON b.user_id = n.user_id_2
      WHERE n.nomination_type = 'para'
      ORDER BY n.nomination_date DESC
      LIMIT 1`,
  )

  const p = pidorRows[0]
  const pr = paraRows[0]
  return {
    pidor: p
      ? {
          name: displayName(p.first_name, p.username),
          date: String(p.nomination_date).slice(0, 10),
          count: Number(p.pidor_count ?? 0),
        }
      : null,
    para: pr
      ? {
          first: displayName(pr.f1, pr.u1),
          second: displayName(pr.f2, pr.u2),
          date: String(pr.nomination_date).slice(0, 10),
        }
      : null,
  }
}
