// Server-only world_events emitter — faithful TS mirror of the bot's
// app/services/world_events.py emit()/emit_safe(), running against the SAME
// Postgres on a caller-provided transaction client.
//
// Why this exists (Phase 1 — "unify Drun's senses"): the bot is the authority
// and the normal writer of world_events, but the site already performs approved,
// audited, bot-rule-mirroring writes (see lib/shop-actions.ts:buyGift). Web and
// mini-app player activity (gift purchase, item sell, case open via internal API,
// inventory actions) must become visible to Drun's worldview, which only reads
// world_events. So site writes project into world_events inside the SAME
// transaction as the action — exactly like the bot does — never as a second
// economy writer, never bypassing the ledger.
//
// Contract parity with the bot:
//   * idempotent INSERT ... ON CONFLICT (ref_table, ref_id) DO NOTHING;
//   * NOTIFY world_events only for severity >= 2 (real-time Drun reactions);
//   * never throws (emitWorldEvent is the emit_safe equivalent) — a failed
//     projection must not roll back a committed player action.
//
// meta.channel distinguishes surfaces ('web' | 'miniapp'); the bot tags 'bot'.
import 'server-only'

import type { PoolClient } from 'pg'

// Canonical default severities — MUST stay in sync with the bot's
// app/services/world_events.py DEFAULT_SEVERITY. Drift sentinel lives in
// test/world-events.test.ts.
export const WORLD_EVENT_SEVERITY: Record<string, number> = {
  case_open: 0,
  case_jackpot: 3,
  case_gift_drop: 2,
  gift_purchase: 1,
  gift_delivered: 1,
  gift_to_player: 2,
  casino_big_win: 2,
  treasure_found: 1,
  achievement_unlocked: 1,
  marriage_created: 2,
  mmr_rank_up: 2,
  duel_won: 1,
  season_ended: 3,
  drun_tax: 2,
  drun_grant: 2,
  mod_ban: 2,
  mod_mute: 1,
  mod_warn: 1,
  mod_kick: 2,
  reputation_change: 1,
  nomination_pidor: 1,
  nomination_para: 2,
  item_sold: 1,
  drun_event_resolved: 2,
}

export type WorldEventInput = {
  type: string
  actorId?: number | null
  targetId?: number | null
  amount?: number | null
  refTable?: string | null
  refId?: number | null
  severity?: number | null
  meta?: Record<string, unknown>
}

/**
 * Inserts a world_events row on the given transaction client and, for
 * severity >= 2, fires NOTIFY world_events so Drun reacts in real time.
 * Mirrors the bot's emit(); the CALLER commits (same transaction as the action).
 * Throws on DB error — use emitWorldEvent() for the non-throwing variant.
 */
export async function emitWorldEventRaw(
  client: PoolClient,
  ev: WorldEventInput,
): Promise<void> {
  const severity =
    ev.severity != null ? ev.severity : WORLD_EVENT_SEVERITY[ev.type] ?? 0

  await client.query(
    `INSERT INTO world_events
       (type, actor_id, target_id, amount, ref_table, ref_id, severity, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CAST($8 AS jsonb))
     ON CONFLICT (ref_table, ref_id) WHERE ref_table IS NOT NULL
     DO NOTHING`,
    [
      ev.type,
      ev.actorId ?? null,
      ev.targetId ?? null,
      ev.amount ?? null,
      ev.refTable ?? null,
      ev.refId ?? null,
      severity,
      JSON.stringify(ev.meta ?? {}),
    ],
  )

  // Pub/sub only for notable events (severity >= 2), matching the bot, so the
  // listener isn't drowned by routine site activity (case_open=0).
  if (severity >= 2) {
    const payload = JSON.stringify({
      type: ev.type,
      severity,
      actor_id: ev.actorId ?? null,
      target_id: ev.targetId ?? null,
      amount: ev.amount ?? null,
      ref_table: ev.refTable ?? null,
      ref_id: ev.refId ?? null,
    })
    await client.query(`SELECT pg_notify('world_events', $1)`, [payload])
  }
}

/**
 * Non-throwing emit (the emit_safe equivalent). The player action is already
 * committed/about-to-commit on its own ledger; a failed event projection must
 * never break gameplay. Logs and swallows.
 */
export async function emitWorldEvent(
  client: PoolClient,
  ev: WorldEventInput,
): Promise<void> {
  try {
    await emitWorldEventRaw(client, ev)
  } catch (error) {
    console.warn(`[world_events] emit failed (type=${ev.type})`, error)
  }
}
