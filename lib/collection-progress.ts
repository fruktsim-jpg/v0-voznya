import 'server-only'

import { query } from './db'
import { LIVE_STATUSES } from './admin/lifecycle'

/**
 * Collection PRESSURE (read-only) — turns authored `collections` into player
 * motivation without a dedicated destination. For each collection the player
 * has at least one piece of, computes owned / total live pieces, completion %,
 * the missing count, and ownership-rarity (how many players completed it). Used
 * to surface "part of <set> · 4/7 · осталось 3" inside existing surfaces.
 *
 * Pure read against the shared bot DB; degrades to [] if tables are missing.
 * "Live pieces" = published/scheduled inventory_items in the collection, so a
 * draft piece doesn't inflate the denominator.
 */

const liveList = LIVE_STATUSES.map((s) => `'${s}'`).join(',')

export type CollectionProgress = {
  code: string
  name: string
  kind: string
  /** total live (published) pieces in the set */
  total: number
  /** distinct pieces the player owns */
  owned: number
  missing: number
  completed: boolean
  /** how many players have completed the whole set (ownership-rarity) */
  completedByPlayers: number
}

/**
 * Player-facing collection progress for sets the player has started.
 * One grouped query for the denominators + the player's owned distinct codes.
 */
export async function getPlayerCollections(userId: number): Promise<CollectionProgress[]> {
  try {
    const rows = await query<{
      code: string
      name: string
      kind: string
      total: string
      owned: string
    }>(
      `SELECT c.code, c.name, c.kind,
              COUNT(DISTINCT i.code) FILTER (WHERE i.status IN (${liveList}))::text AS total,
              COUNT(DISTINCT i.code) FILTER (
                WHERE i.status IN (${liveList})
                  AND inv.user_id IS NOT NULL
              )::text AS owned
         FROM collections c
         JOIN inventory_items i ON i.collection_code = c.code
         LEFT JOIN inventory inv ON inv.item_code = i.code AND inv.user_id = $1
        WHERE c.status IN (${liveList})
        GROUP BY c.code, c.name, c.kind
       HAVING COUNT(DISTINCT i.code) FILTER (
                WHERE i.status IN (${liveList}) AND inv.user_id IS NOT NULL
              ) > 0
        ORDER BY c.sort_order, c.name`,
      [userId],
    )

    const out: CollectionProgress[] = rows.map((r) => {
      const total = Number(r.total) || 0
      const owned = Number(r.owned) || 0
      return {
        code: r.code,
        name: r.name,
        kind: r.kind,
        total,
        owned,
        missing: Math.max(0, total - owned),
        completed: total > 0 && owned >= total,
        completedByPlayers: 0,
      }
    })

    // Ownership-rarity: how many players own every live piece of each set the
    // player has started. Computed for ALL started sets in ONE grouped query
    // (count of players whose distinct owned live pieces reach the set's live
    // total), instead of a per-collection round trip.
    const startedCodes = out.filter((c) => c.total > 0).map((c) => c.code)
    if (startedCodes.length > 0) {
      try {
        const rarityRows = await query<{ collection_code: string; n: string }>(
          `SELECT i.collection_code, COUNT(*)::text AS n FROM (
             SELECT i.collection_code, inv.user_id
               FROM inventory inv
               JOIN inventory_items i ON i.code = inv.item_code
              WHERE i.collection_code = ANY($1) AND i.status IN (${liveList})
              GROUP BY i.collection_code, inv.user_id
             HAVING COUNT(DISTINCT inv.item_code) >= (
                SELECT COUNT(DISTINCT i2.code)
                  FROM inventory_items i2
                 WHERE i2.collection_code = i.collection_code
                   AND i2.status IN (${liveList})
             )
           ) i
           GROUP BY i.collection_code`,
          [startedCodes],
        )
        const completedByPlayers = new Map<string, number>(
          rarityRows.map((r) => [r.collection_code, Number(r.n) || 0]),
        )
        for (const c of out) {
          c.completedByPlayers = completedByPlayers.get(c.code) ?? 0
        }
      } catch {
        /* keep 0 */
      }
    }

    return out
  } catch {
    return []
  }
}

/**
 * Where missing pieces of a collection come from: which live cases drop any
 * still-missing piece. Read-only; used to convert a gap into a next action.
 */
export type CollectionSource = { caseCode: string; caseName: string }

export async function getCollectionSources(
  collectionCode: string,
  userId: number,
): Promise<CollectionSource[]> {
  try {
    return await query<CollectionSource>(
      `SELECT DISTINCT d.item_code AS "caseCode", d.name AS "caseName"
         FROM case_definitions d
         JOIN case_rewards r ON r.case_item_code = d.item_code
         JOIN inventory_items i ON i.code = r.reward_item_code
        WHERE i.collection_code = $1
          AND d.is_active = true
          AND i.code NOT IN (
            SELECT item_code FROM inventory WHERE user_id = $2
          )
        ORDER BY d.name`,
      [collectionCode, userId],
    )
  } catch {
    return []
  }
}
