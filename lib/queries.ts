import { query } from './db'
import { ACHIEVEMENTS } from './voznya-bot'

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

export type MessageTop = { rank: number; name: string; count: number }
export type MessageActivityPoint = { day: string; count: number }
export type MessageStats = {
  total: number
  top: MessageTop[]
  activity: MessageActivityPoint[]
}

/**
 * Message statistics. Relies on bot tables added in migration 0004
 * (users.messages_count and message_daily). If those don't exist yet, the
 * query throws and the API returns 503 — the UI then hides the messages block.
 */
export async function getMessageStats(topLimit = 10, activityDays = 14): Promise<MessageStats> {
  const totalRows = await query<{ total: string | null }>(
    `SELECT COALESCE(SUM(messages_count), 0) AS total FROM users`,
  )
  const topRows = await query<{
    first_name: string | null
    username: string | null
    messages_count: string
  }>(
    `SELECT first_name, username, messages_count
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
  achievementsUnlocked: number
  achievements: UserAchievement[]
  rankInTop: number | null
  marriage: {
    partnerId: number
    partnerName: string
    marriedAt: string
    days: number
  } | null
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
    created_at: string
  }>(
    `SELECT 
       user_id, username, first_name,
       balance, total_earned, total_spent,
       farm_streak, max_farm_streak,
       duels_won, duels_lost,
       treasures_found, pidor_count,
       farm_success_count, casino_games_count,
       created_at
     FROM users
     WHERE user_id = $1`,
    [userId],
  )

  if (rows.length === 0) return null

  const user = rows[0]

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
    achievementsUnlocked: achievements.length,
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
  }
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
