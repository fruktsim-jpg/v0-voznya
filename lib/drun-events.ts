import 'server-only'
import { unstable_cache } from 'next/cache'
import { query } from '@/lib/db'

/**
 * Read-only Drun event board. The bot owns `drun_events` and all payouts; the
 * site only exposes active events so players can discover what to join in chat.
 */

export type DrunEventItem = {
  id: string
  kind: string
  title: string
  body: string
  rewardAmount: number | null
  participantCount: number
  deadlineAt: string | null
  createdAt: string
}

export type DrunEventsBoard = {
  items: DrunEventItem[]
  hasContent: boolean
}

const EMPTY: DrunEventsBoard = { items: [], hasContent: false }

type Row = {
  id: string
  kind: string
  title: string
  body: string | null
  reward_amount: string | null
  participants_count: string
  deadline_at: string | null
  created_at: string
}

async function _getActiveDrunEvents(): Promise<DrunEventsBoard> {
  try {
    const rows = await query<Row>(
      `SELECT id,
              kind,
              title,
              body,
              reward_amount,
              jsonb_array_length(COALESCE(participants, '[]'::jsonb))::text AS participants_count,
              deadline_at,
              created_at
         FROM drun_events
        WHERE status = 'active'
        ORDER BY deadline_at ASC NULLS LAST, created_at DESC
        LIMIT 8`,
    )
    const items = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body ?? '',
      rewardAmount: r.reward_amount == null ? null : Number(r.reward_amount),
      participantCount: Number(r.participants_count ?? 0),
      deadlineAt: r.deadline_at,
      createdAt: r.created_at,
    }))
    return { items, hasContent: items.length > 0 }
  } catch {
    return EMPTY
  }
}

export const getActiveDrunEvents = unstable_cache(
  _getActiveDrunEvents,
  ['drun-active-events'],
  { revalidate: 30, tags: ['drun-active-events'] },
)
