import 'server-only'
import { query } from '@/lib/db'
import { eventItemClass, type CommunityEvent, type EventCode } from '@/lib/events'
import type { Rarity } from '@/lib/rarity'

/**
 * Community feed V1 — РЕАЛЬНЫЕ события из существующих таблиц (read-only),
 * по VOZNYA_EVENTS_SYSTEM. Никаких новых таблиц/БД/API. UNION существующих
 * леджеров, нормализация в `CommunityEvent`. Деградирует в [] при любой ошибке
 * (немигрированная БД), как остальные лоадеры сайта.
 *
 * Источники: case_openings, gift_transactions, transactions(casino/treasure),
 * user_achievements, marriages, mmr_entries.
 */

type FeedRow = {
  code: string
  ev_id: string
  actor_id: string | null
  actor_name: string | null
  target_id: string | null
  target_name: string | null
  value: string | null
  rarity: string | null
  created_at: string
  item_code: string | null
  item_name: string | null
}

const ICONS: Record<EventCode, string> = {
  CASE_OPEN: '📦',
  CASE_JACKPOT: '💎',
  CASE_GIFT_DROP: '🎁',
  GIFT_PURCHASE: '🛒',
  GIFT_DELIVERED: '🎁',
  GIFT_PLAYER: '💝',
  ACHIEVEMENT_UNLOCKED: '🏆',
  MMR_RANK_UP: '⬆️',
  MARRIAGE_CREATED: '💍',
  CASINO_BIG_WIN: '🎰',
  TREASURE_FOUND: '🪙',
}

const RARITIES: ReadonlySet<string> = new Set([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
])

function toRarity(v: string | null): Rarity {
  return (v && RARITIES.has(v) ? v : 'common') as Rarity
}

// Порог «крупного выигрыша» в казино (ешки выплаты). Конфиг на стороне чтения.
const CASINO_BIG_WIN_MIN = 1000
// Порог заметного прироста MMR, чтобы не спамить мелочью.
const MMR_EVENT_MIN = 50

/**
 * Возвращает последние события сообщества (по убыванию времени).
 * `limit` ограничивает финальную ленту.
 */
export async function getCommunityFeed(limit = 30): Promise<CommunityEvent[]> {
  // Имя игрока: first_name → username → «Игрок». В каждой подвыборке свой LIMIT,
  // чтобы UNION не сканировал лишнее; финальная сортировка/срез — снаружи.
  const per = Math.max(limit, 20)
  const sql = `
    WITH feed AS (
      -- Открытия кейсов. Джекпот и Telegram Gift/Premium выделяем отдельными
      -- кодами, чтобы витрина показывала «социальное доказательство» (кто-то
      -- сорвал джекпот / выбил подарок), а не безликое «открыл кейс».
      SELECT CASE
               WHEN co.reward_kind = 'tg_gift' THEN 'CASE_GIFT_DROP'
               WHEN cr.is_jackpot THEN 'CASE_JACKPOT'
               ELSE 'CASE_OPEN'
             END AS code,
             co.id AS ev_id,
             co.user_id AS actor_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS actor_name,
             NULL::bigint AS target_id, NULL::text AS target_name,
             -- Для подарка показываем его ценность в Stars, иначе сумму ешек.
             CASE WHEN co.reward_kind = 'tg_gift' THEN gc.star_cost
                  ELSE co.amount END AS value,
             CASE
               WHEN co.reward_kind = 'tg_gift' THEN 'mythic'
               WHEN cr.is_jackpot THEN 'legendary'
               ELSE COALESCE(ii.rarity, 'common')
             END AS rarity,
             co.created_at,
             co.reward_item_code AS item_code,
             COALESCE(ii.name, gc.name) AS item_name
        FROM case_openings co
        JOIN users u ON u.user_id = co.user_id
        LEFT JOIN case_rewards cr ON cr.id = co.reward_id
        LEFT JOIN inventory_items ii ON ii.code = co.reward_item_code
        LEFT JOIN gift_catalog gc ON gc.code = co.reward_item_code
       ORDER BY co.created_at DESC
       LIMIT ${per}
    )

    , gifts AS (
      SELECT CASE WHEN g.kind = 'tg_gift' THEN 'GIFT_DELIVERED'
                  WHEN g.gift_type = 'player' THEN 'GIFT_PLAYER'
                  ELSE 'GIFT_PURCHASE' END AS code,
             g.id AS ev_id,
             COALESCE(g.sender_user_id, g.recipient_user_id) AS actor_id,
             COALESCE(NULLIF(su.first_name,''), NULLIF(su.username,''),
                      NULLIF(ru.first_name,''), NULLIF(ru.username,''), 'Игрок') AS actor_name,
             g.recipient_user_id AS target_id,
             COALESCE(NULLIF(ru.first_name,''), NULLIF(ru.username,''), 'Игрок') AS target_name,
             g.amount AS value,
             CASE WHEN g.kind = 'tg_gift' THEN 'legendary' ELSE 'rare' END AS rarity,
             g.created_at,
             g.item_code AS item_code,
             ggc.name AS item_name
        FROM gift_transactions g
        LEFT JOIN users su ON su.user_id = g.sender_user_id
        LEFT JOIN users ru ON ru.user_id = g.recipient_user_id
        LEFT JOIN gift_catalog ggc ON ggc.code = g.item_code
       WHERE g.status = 'completed'
       ORDER BY g.created_at DESC
       LIMIT ${per}
    )
    , wins AS (
      SELECT 'CASINO_BIG_WIN' AS code, t.id AS ev_id,
             t.user_id AS actor_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS actor_name,
             NULL::bigint AS target_id, NULL::text AS target_name,
             (t.meta->>'payout')::bigint AS value,
             'epic' AS rarity,
             t.created_at,
             NULL::text AS item_code,
             NULL::text AS item_name
        FROM transactions t
        JOIN users u ON u.user_id = t.user_id
       WHERE t.reason = 'casino' AND t.meta ? 'payout'
         AND (t.meta->>'payout')::bigint >= ${CASINO_BIG_WIN_MIN}
       ORDER BY t.created_at DESC
       LIMIT ${per}
    )
    , treasures AS (
      SELECT 'TREASURE_FOUND' AS code, t.id AS ev_id,
             t.user_id AS actor_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS actor_name,
             NULL::bigint AS target_id, NULL::text AS target_name,
             t.amount AS value,
             'uncommon' AS rarity,
             t.created_at,
             NULL::text AS item_code,
             NULL::text AS item_name
        FROM transactions t
        JOIN users u ON u.user_id = t.user_id
       WHERE t.reason = 'treasure' AND t.amount > 0
       ORDER BY t.created_at DESC
       LIMIT ${per}
    )
    , achievements AS (
      SELECT 'ACHIEVEMENT_UNLOCKED' AS code, ua.user_id AS ev_id,
             ua.user_id AS actor_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS actor_name,
             NULL::bigint AS target_id, NULL::text AS target_name,
             NULL::bigint AS value,
             'uncommon' AS rarity,
             ua.unlocked_at AS created_at,
             NULL::text AS item_code,
             NULL::text AS item_name
        FROM user_achievements ua
        JOIN users u ON u.user_id = ua.user_id
       ORDER BY ua.unlocked_at DESC
       LIMIT ${per}
    )
    , marriages_cte AS (
      SELECT 'MARRIAGE_CREATED' AS code, m.id AS ev_id,
             m.user_id_1 AS actor_id,
             COALESCE(NULLIF(u1.first_name,''), NULLIF(u1.username,''), 'Игрок') AS actor_name,
             m.user_id_2 AS target_id,
             COALESCE(NULLIF(u2.first_name,''), NULLIF(u2.username,''), 'Игрок') AS target_name,
             NULL::bigint AS value,
             'rare' AS rarity,
             m.married_at AS created_at,
             NULL::text AS item_code,
             NULL::text AS item_name
        FROM marriages m
        JOIN users u1 ON u1.user_id = m.user_id_1
        JOIN users u2 ON u2.user_id = m.user_id_2
       ORDER BY m.married_at DESC
       LIMIT ${per}
    )
    , mmr AS (
      SELECT 'MMR_RANK_UP' AS code, me.id AS ev_id,
             me.player_id AS actor_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS actor_name,
             NULL::bigint AS target_id, NULL::text AS target_name,
             me.amount AS value,
             'epic' AS rarity,
             me.created_at,
             NULL::text AS item_code,
             NULL::text AS item_name
        FROM mmr_entries me
        JOIN users u ON u.user_id = me.player_id
       WHERE me.amount >= ${MMR_EVENT_MIN}
       ORDER BY me.created_at DESC
       LIMIT ${per}
    )
    SELECT code, ev_id::text AS ev_id, actor_id::text AS actor_id, actor_name,
           target_id::text AS target_id, target_name,
           value::text AS value, rarity, created_at, item_code, item_name
      FROM (
        SELECT * FROM feed
        UNION ALL SELECT * FROM gifts
        UNION ALL SELECT * FROM wins
        UNION ALL SELECT * FROM treasures
        UNION ALL SELECT * FROM achievements
        UNION ALL SELECT * FROM marriages_cte
        UNION ALL SELECT * FROM mmr
      ) all_events
     ORDER BY created_at DESC
     LIMIT ${limit}
  `

  let rows: FeedRow[]
  try {
    rows = await query<FeedRow>(sql)
  } catch {
    return []
  }

  return rows.map(mapRow)
}

function mapRow(r: FeedRow): CommunityEvent {
  const code = r.code as EventCode
  const value = r.value != null ? Number(r.value) : null
  const itemCode = r.item_code ?? null
  return {
    id: `${code}:${r.ev_id}`,
    code,
    actor: {
      id: r.actor_id ? Number(r.actor_id) : 0,
      name: r.actor_name ?? 'Игрок',
    },
    target:
      r.target_id != null
        ? { id: Number(r.target_id), name: r.target_name ?? 'Игрок' }
        : null,
    value: Number.isFinite(value as number) ? value : null,
    rarity: toRarity(r.rarity),
    occurredAt: new Date(r.created_at).toISOString(),
    icon: ICONS[code] ?? '✨',
    itemCode,
    itemClass: itemCode ? eventItemClass(code) : null,
    itemName: r.item_name ?? null,
  }
}

/**
 * Личная лента игрока (VOZNYA_EVENTS_SYSTEM §6): его открытия кейсов,
 * достижения, подарки (вход/выход), брак, крупные выигрыши, MMR, клады.
 * Read-only, без новых таблиц.
 */
export async function getUserFeed(
  userId: number,
  limit = 30,
): Promise<CommunityEvent[]> {
  const sql = `
    WITH ev AS (
      SELECT CASE
               WHEN co.reward_kind = 'tg_gift' THEN 'CASE_GIFT_DROP'
               WHEN cr.is_jackpot THEN 'CASE_JACKPOT'
               ELSE 'CASE_OPEN'
             END AS code,
             co.id AS ev_id, co.user_id AS actor_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS actor_name,
             NULL::bigint AS target_id, NULL::text AS target_name,
             CASE WHEN co.reward_kind = 'tg_gift' THEN gc.star_cost
                  ELSE co.amount END AS value,
             CASE
               WHEN co.reward_kind = 'tg_gift' THEN 'mythic'
               WHEN cr.is_jackpot THEN 'legendary'
               ELSE COALESCE(ii.rarity, 'common')
             END AS rarity,
             co.created_at,
             co.reward_item_code AS item_code,
             COALESCE(ii.name, gc.name) AS item_name
        FROM case_openings co
        JOIN users u ON u.user_id = co.user_id
        LEFT JOIN case_rewards cr ON cr.id = co.reward_id
        LEFT JOIN inventory_items ii ON ii.code = co.reward_item_code
        LEFT JOIN gift_catalog gc ON gc.code = co.reward_item_code
       WHERE co.user_id = $1

      UNION ALL
      SELECT 'ACHIEVEMENT_UNLOCKED', ua.user_id, ua.user_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок'),
             NULL::bigint, NULL::text, NULL::bigint, 'uncommon', ua.unlocked_at,
             NULL::text, NULL::text
        FROM user_achievements ua
        JOIN users u ON u.user_id = ua.user_id
       WHERE ua.user_id = $1
      UNION ALL
      SELECT CASE WHEN g.kind='tg_gift' THEN 'GIFT_DELIVERED' ELSE 'GIFT_PLAYER' END,
             g.id, COALESCE(g.sender_user_id, g.recipient_user_id),
             COALESCE(NULLIF(su.first_name,''), NULLIF(su.username,''),
                      NULLIF(ru.first_name,''), NULLIF(ru.username,''), 'Игрок'),
             g.recipient_user_id,
             COALESCE(NULLIF(ru.first_name,''), NULLIF(ru.username,''), 'Игрок'),
             g.amount, CASE WHEN g.kind='tg_gift' THEN 'legendary' ELSE 'rare' END, g.created_at,
             g.item_code, ggc.name
        FROM gift_transactions g
        LEFT JOIN users su ON su.user_id = g.sender_user_id
        LEFT JOIN users ru ON ru.user_id = g.recipient_user_id
        LEFT JOIN gift_catalog ggc ON ggc.code = g.item_code
       WHERE g.status='completed' AND (g.sender_user_id = $1 OR g.recipient_user_id = $1)
      UNION ALL
      SELECT 'CASINO_BIG_WIN', t.id, t.user_id,
             COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок'),
             NULL::bigint, NULL::text, (t.meta->>'payout')::bigint, 'epic', t.created_at,
             NULL::text, NULL::text
        FROM transactions t
        JOIN users u ON u.user_id = t.user_id
       WHERE t.user_id = $1 AND t.reason='casino' AND t.meta ? 'payout'
         AND (t.meta->>'payout')::bigint >= ${CASINO_BIG_WIN_MIN}
    )
    SELECT code, ev_id::text AS ev_id, actor_id::text AS actor_id, actor_name,
           target_id::text AS target_id, target_name,
           value::text AS value, rarity, created_at, item_code, item_name
      FROM ev
     ORDER BY created_at DESC
     LIMIT ${limit}
  `
  let rows: FeedRow[]
  try {
    rows = await query<FeedRow>(sql, [userId])
  } catch {
    return []
  }
  return rows.map(mapRow)
}


