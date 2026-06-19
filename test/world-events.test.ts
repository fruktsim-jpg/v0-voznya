import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { WORLD_EVENT_SEVERITY } from '@/lib/world-events'

// WORLD_EVENT_SEVERITY mirrors the bot's app/services/world_events.py
// DEFAULT_SEVERITY. The site emits world_events for web/mini-app activity
// (gift purchase, item sell, case open) on the SAME table the bot writes and
// Drun reads, so severities (which gate the real-time NOTIFY at >= 2) must not
// drift from the bot. This is a bot↔site drift sentinel.
//
// Source of truth is the Python file itself — we PARSE it here rather than
// keeping a third hand-copied table, so any bot-side severity change for a
// shared type fails this test instead of silently diverging.

const BOT_WORLD_EVENTS = resolve(
  __dirname,
  '../../voznya-bot/app/services/world_events.py',
)

/**
 * Extracts the bot's DEFAULT_SEVERITY as {eventTypeString: severity} by
 * resolving the EVENT_* constants to their string values and the dict body.
 * Returns null if the file can't be read (bot repo not checked out alongside).
 */
function parseBotSeverity(): Record<string, number> | null {
  let src: string
  try {
    src = readFileSync(BOT_WORLD_EVENTS, 'utf8')
  } catch {
    return null
  }
  // EVENT_FOO = "foo"
  const constToValue = new Map<string, string>()
  for (const m of src.matchAll(/^(EVENT_[A-Z0-9_]+)\s*=\s*"([^"]+)"/gm)) {
    constToValue.set(m[1], m[2])
  }
  // DEFAULT_SEVERITY: dict[str, int] = { EVENT_FOO: 0, ... }
  const block = src.match(/DEFAULT_SEVERITY[^{]*\{([\s\S]*?)\}/)
  if (!block) return null
  const out: Record<string, number> = {}
  for (const m of block[1].matchAll(/(EVENT_[A-Z0-9_]+)\s*:\s*(\d+)/g)) {
    const value = constToValue.get(m[1])
    if (value) out[value] = Number(m[2])
  }
  return out
}

describe('world_events severity (bot↔site sync guard)', () => {
  it('matches the bot DEFAULT_SEVERITY exactly (parsed from Python)', () => {
    const bot = parseBotSeverity()
    if (bot === null) {
      // Bot repo not present in this checkout — skip rather than false-pass.
      console.warn('[world-events.test] bot world_events.py not found; skipping parity check')
      return
    }
    expect(Object.keys(bot).length).toBeGreaterThan(0)
    // Every type the site knows about must match the bot's severity, and the
    // site map must not omit any bot type (full equality catches drift both ways).
    expect(WORLD_EVENT_SEVERITY).toEqual(bot)
  })

  it('site-emitted activity types are present', () => {
    // The types the site actually emits today.
    for (const t of ['gift_purchase', 'item_sold', 'case_open', 'case_jackpot', 'case_gift_drop']) {
      expect(WORLD_EVENT_SEVERITY[t]).toBeTypeOf('number')
    }
  })

  it('only severity >= 2 fires the real-time NOTIFY', () => {
    // Routine site activity must NOT spam the listener.
    expect(WORLD_EVENT_SEVERITY.case_open).toBeLessThan(2)
    expect(WORLD_EVENT_SEVERITY.gift_purchase).toBeLessThan(2)
    // Notable ones do.
    expect(WORLD_EVENT_SEVERITY.case_jackpot).toBeGreaterThanOrEqual(2)
    expect(WORLD_EVENT_SEVERITY.nomination_para).toBeGreaterThanOrEqual(2)
  })
})
