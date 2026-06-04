import { query } from './db'

function displayName(first_name: string | null, username: string | null): string {
  if (first_name && first_name.trim()) return first_name.trim()
  if (username && username.trim()) return `@${username.replace(/^@/, '')}`
  return 'Аноним'
}

export type CommunityStats = {
  users: number
  eshInCirculation: number
  duels: number
  farmers: number
  treasuresFound: number
  marriages: number
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const rows = await query<{
    users: string
    esh: string | null
    duels: string | null
    farmers: string
    treasures: string | null
    marriages: string
  }>(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COALESCE(SUM(balance), 0) FROM users) AS esh,
       (SELECT COALESCE(SUM(duels_won), 0) FROM users) AS duels,
       (SELECT COUNT(*) FROM users WHERE last_farm_at IS NOT NULL OR max_farm_streak > 0) AS farmers,
       (SELECT COALESCE(SUM(treasures_found), 0) FROM users) AS treasures,
       (SELECT COUNT(*) FROM marriages WHERE divorced_at IS NULL) AS marriages`,
  )
  const r = rows[0]
  return {
    users: Number(r.users),
    eshInCirculation: Number(r.esh ?? 0),
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
  name: string
  balance: number
}

export async function getTopRich(limit = 10): Promise<RichUser[]> {
  const rows = await query<{
    first_name: string | null
    username: string | null
    balance: string
  }>(
    `SELECT first_name, username, balance
       FROM users
      ORDER BY balance DESC, user_id ASC
      LIMIT $1`,
    [limit],
  )
  return rows.map((r, i) => ({
    rank: i + 1,
    name: displayName(r.first_name, r.username),
    balance: Number(r.balance),
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
