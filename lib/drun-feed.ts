import 'server-only'
import { query } from '@/lib/db'

/**
 * Public "Друн говорит" feed loader (Phase A — Drun public presence).
 *
 * READ-ONLY. Sources Drun's self-standing utterances from `ai_messages` where
 * `channel='web'` and `role='assistant'` — the WEB presence surface the bot
 * already writes via `DrunPresence.announce()` (no new table). Trigger metadata
 * (`trigger_event_id`, `user_id`, raw `meta`) is intentionally NOT selected: the
 * public feed shows only the message and when it was said.
 *
 * Degrades to [] on any error (un-migrated DB / outage), like the other site
 * loaders — Drun simply looks quiet, never an error page.
 */

export type DrunFeedItem = {
  id: string
  content: string
  createdAt: string
}

/** Keyset cursor for pagination: the (createdAt, id) of the last seen row. */
export type DrunFeedCursor = {
  createdAt: string
  id: string
}

const MAX_LIMIT = 50

/**
 * Newest-first page of Drun's public utterances.
 *
 * Ordered by ``(created_at DESC, id DESC)`` so the existing
 * ``ix_ai_messages_channel_created (channel, created_at)`` index drives both the
 * ``channel='web'`` filter and the ordering (a reverse index scan over a sparse
 * subset of the highest-volume table), with ``id`` only as a tiebreaker for rows
 * sharing a timestamp. Keyset pagination uses a row-value comparison on
 * ``(created_at, id)`` so boundary ties are neither skipped nor duplicated.
 *
 * @param limit  page size (clamped 1..50)
 * @param before keyset cursor (the last seen row's createdAt + id). Omit for the
 *               first page.
 */
export async function getDrunFeed(
  limit = 20,
  before?: DrunFeedCursor | null,
): Promise<DrunFeedItem[]> {
  const size = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit) || 20))
  const cursor =
    before && before.createdAt && /^\d+$/.test(before.id) ? before : null
  try {
    const rows = await query<{
      id: string
      content: string
      created_at: string
    }>(
      `SELECT id, content, created_at
         FROM ai_messages
        WHERE channel = 'web'
          AND role = 'assistant'
          ${cursor ? 'AND (created_at, id) < ($2::timestamptz, $3::bigint)' : ''}
        ORDER BY created_at DESC, id DESC
        LIMIT $1`,
      cursor ? [size, cursor.createdAt, cursor.id] : [size],
    )
    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}
