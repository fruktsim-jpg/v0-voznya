import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Drun worldview loader — bot↔site drift sentinel.
 *
 * lib/drun-worldview.ts hardcodes the ai_memories `kind` values and the
 * prediction `source` markers it reads. Those strings are owned by the bot's
 * worldview module; if they are renamed there, the site would silently render an
 * empty chronicle. Parse the Python (like world-events.test.ts) and assert the
 * constants the loader depends on still exist.
 */

const WORLDVIEW = resolve(
  __dirname,
  '../../voznya-bot/app/features/drun/worldview.py',
)

function readBot(): string | null {
  try {
    return readFileSync(WORLDVIEW, 'utf8')
  } catch {
    return null
  }
}

describe('worldview kind/source constants mirror worldview.py', () => {
  const src = readBot()

  it('bot source is reachable', () => {
    expect(src, 'voznya-bot must be checked out alongside v0-voznya').not.toBeNull()
  })

  it('storyline/prediction/legend kinds are unchanged', () => {
    if (!src) return
    expect(src.includes('KIND_STORYLINE = "storyline"')).toBe(true)
    expect(src.includes('KIND_PREDICTION = "prediction"')).toBe(true)
    expect(src.includes('KIND_LEGEND = "legend"')).toBe(true)
  })

  it('prediction hit/miss source markers are unchanged', () => {
    if (!src) return
    expect(src.includes('PRED_HIT = "prediction_hit"')).toBe(true)
    expect(src.includes('PRED_MISS = "prediction_miss"')).toBe(true)
  })
})
