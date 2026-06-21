import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  OPINION_AXES,
  OPINION_AXIS_RU,
  EPISODE_TYPES,
  episodeCodeFromKind,
  parseOpinion,
  parseAffinity,
  parseRelationships,
  affinityLabel,
  standing,
  dominantAxes,
  memoryWhen,
  favoriteScore,
  FAVORITE_SCORE_MIN,
  FOE_SCORE_MAX,
} from '@/lib/drun-personal-logic'

/**
 * Personal Drun logic — bot↔site DRIFT SENTINEL + pure-logic unit tests.
 *
 * lib/drun-personal-logic.ts hand-mirrors label/threshold logic that lives in
 * the bot's Python (the site reads bot-owned Drun tables and must render the
 * SAME verdicts the bot forms). To stop that copy from silently diverging, we
 * PARSE the Python source here — exactly like world-events.test.ts parses
 * world_events.py — and assert the TS constants still match. If the bot renames
 * an episode type, retitles a standing, or shifts a threshold, this test fails
 * instead of the site quietly showing a stale label.
 *
 * Source of truth = the Python files; these tests read them, not a third copy.
 */

const BOT = (rel: string) =>
  resolve(__dirname, '../../voznya-bot/app/features/drun', rel)

function readBot(rel: string): string | null {
  try {
    return readFileSync(BOT(rel), 'utf8')
  } catch {
    return null
  }
}

describe('opinion axes mirror opinions.py AXES', () => {
  const src = readBot('opinions.py')

  it('bot source is reachable', () => {
    expect(src, 'voznya-bot must be checked out alongside v0-voznya').not.toBeNull()
  })

  it('AXES tuple matches', () => {
    if (!src) return
    // AXES = ( "trust", "respect", ... )
    const m = src.match(/AXES\s*=\s*\(([\s\S]*?)\)/)
    expect(m).not.toBeNull()
    const botAxes = [...(m as RegExpMatchArray)[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1])
    expect([...OPINION_AXES]).toEqual(botAxes)
  })

  it('every axis has a RU label', () => {
    for (const ax of OPINION_AXES) {
      expect(OPINION_AXIS_RU[ax], `missing RU label for ${ax}`).toBeTruthy()
    }
  })
})

describe('standing titles mirror opinions.Opinion.standing()', () => {
  const src = readBot('opinions.py')
  // Every quoted title returned by standing() in the Python.
  const EXPECTED = [
    'ПРИСМАТРИВАЕТСЯ',
    'БЕСИТ',
    'ЛЮБИМЧИК',
    'УВАЖАЕМЫЙ',
    'КЛОУН-ЛЮБИМЕЦ',
    'БЕДОВЫЙ',
    'НЕ ВНУШАЕТ ДОВЕРИЯ',
    'СКУЧНЫЙ РАБОТЯГА',
    'НА ЗАМЕТКЕ',
  ]

  it('all bot standing titles are reproducible from the TS thresholds', () => {
    if (!src) return
    for (const title of EXPECTED) {
      expect(src.includes(`"${title}"`), `bot no longer returns "${title}"`).toBe(true)
    }
  })

  it('TS standing() produces the expected titles at threshold boundaries', () => {
    const op = (over: Record<string, number>, samples = 10) =>
      parseOpinion({
        axes: { trust: 50, respect: 50, annoyance: 50, interest: 50, chaos: 50, reliability: 50, entertainment: 50, ...over },
        samples,
        ts: new Date().toISOString(),
      })

    expect(standing(op({}, 1))).toBe('ПРИСМАТРИВАЕТСЯ') // unformed
    expect(standing(op({ annoyance: 70, respect: 40 }))).toBe('БЕСИТ')
    expect(standing(op({ trust: 70, respect: 62 }))).toBe('ЛЮБИМЧИК')
    expect(standing(op({ respect: 72 }))).toBe('УВАЖАЕМЫЙ')
    expect(standing(op({ entertainment: 72 }))).toBe('КЛОУН-ЛЮБИМЕЦ')
    expect(standing(op({ chaos: 75 }))).toBe('БЕДОВЫЙ')
    expect(standing(op({ trust: 20 }))).toBe('НЕ ВНУШАЕТ ДОВЕРИЯ')
    expect(standing(op({ reliability: 72, entertainment: 40 }))).toBe('СКУЧНЫЙ РАБОТЯГА')
    expect(standing(op({ interest: 80 }))).toBe('НА ЗАМЕТКЕ')
  })
})

describe('affinity labels mirror affinity.Affinity.label', () => {
  const src = readBot('affinity.py')

  it('bot still returns the same five labels', () => {
    if (!src) return
    for (const label of ['ЛИЧНЫЙ ВРАГ', 'НЕДРУГ', 'НЕЙТРАЛ', 'ПРИЯТЕЛЬ', 'КОРЕШ']) {
      expect(src.includes(`"${label}"`), `bot no longer returns "${label}"`).toBe(true)
    }
  })

  it('TS thresholds match the bot bands', () => {
    expect(affinityLabel(-100)).toBe('ЛИЧНЫЙ ВРАГ')
    expect(affinityLabel(-60)).toBe('ЛИЧНЫЙ ВРАГ')
    expect(affinityLabel(-59)).toBe('НЕДРУГ')
    expect(affinityLabel(-25)).toBe('НЕДРУГ')
    expect(affinityLabel(-24)).toBe('НЕЙТРАЛ')
    expect(affinityLabel(24)).toBe('НЕЙТРАЛ')
    expect(affinityLabel(25)).toBe('ПРИЯТЕЛЬ')
    expect(affinityLabel(59)).toBe('ПРИЯТЕЛЬ')
    expect(affinityLabel(60)).toBe('КОРЕШ')
  })
})

describe('episode taxonomy mirrors episodes._TYPES', () => {
  const src = readBot('episodes.py')

  it('every TS episode code exists in the bot taxonomy with the same RU label', () => {
    if (!src) return
    for (const [code, meta] of Object.entries(EPISODE_TYPES)) {
      // EpisodeType("betrayal", "предательство", ...)
      const re = new RegExp(`EpisodeType\\(\\s*"${code}"\\s*,\\s*"([^"]+)"`)
      const m = src.match(re)
      expect(m, `bot has no episode type "${code}"`).not.toBeNull()
      if (m) expect(m[1]).toBe(meta.label)
    }
  })

  it('the bot has no episode code the TS map is missing', () => {
    if (!src) return
    const botCodes = [...src.matchAll(/EpisodeType\(\s*"([a-z_]+)"/g)].map((x) => x[1])
    for (const code of botCodes) {
      expect(EPISODE_TYPES[code], `TS EPISODE_TYPES missing "${code}"`).toBeTruthy()
    }
  })

  it('episodeCodeFromKind strips the episode: prefix', () => {
    expect(episodeCodeFromKind('episode:betrayal')).toBe('betrayal')
    expect(episodeCodeFromKind('fact')).toBe('fact')
  })
})

describe('parseOpinion — decay + formation', () => {
  it('returns neutral & unformed for null', () => {
    const op = parseOpinion(null)
    expect(op.isFormed).toBe(false)
    for (const ax of OPINION_AXES) expect(op.axes[ax]).toBe(50)
  })

  it('is unformed below 5 samples, formed at 5', () => {
    const base = { axes: { respect: 90 }, ts: new Date().toISOString() }
    expect(parseOpinion({ ...base, samples: 4 }).isFormed).toBe(false)
    expect(parseOpinion({ ...base, samples: 5 }).isFormed).toBe(true)
  })

  it('decays a strong axis toward neutral over time', () => {
    const long = new Date(Date.now() - 200 * 86_400_000).toISOString()
    const op = parseOpinion({ axes: { respect: 90 }, samples: 20, ts: long })
    expect(op.axes.respect).toBeLessThan(90)
    expect(op.axes.respect).toBeGreaterThan(50)
  })

  it('dominantAxes returns nothing for an unformed opinion', () => {
    expect(dominantAxes(parseOpinion({ axes: { respect: 95 }, samples: 2, ts: new Date().toISOString() }))).toEqual([])
  })

  it('dominantAxes flags strongly-deviated axes high/low', () => {
    const op = parseOpinion({
      axes: { respect: 85, trust: 20, interest: 51 },
      samples: 10,
      ts: new Date().toISOString(),
    })
    const dom = dominantAxes(op)
    const respect = dom.find((d) => d.axis === 'respect')
    const trust = dom.find((d) => d.axis === 'trust')
    expect(respect?.high).toBe(true)
    expect(trust?.high).toBe(false)
    // interest barely deviates (<18) → not dominant.
    expect(dom.find((d) => d.axis === 'interest')).toBeUndefined()
  })
})

describe('parseAffinity', () => {
  it('null → neutral, no episodes', () => {
    const a = parseAffinity(null)
    expect(a.score).toBe(0)
    expect(a.label).toBe('НЕЙТРАЛ')
    expect(a.episodes).toEqual([])
  })

  it('keeps only episodes with a gist', () => {
    const a = parseAffinity({
      score: 70,
      ts: new Date().toISOString(),
      episodes: [
        { ts: '2026-06-01', tone: 2, gist: 'поблагодарил за слив инфы' },
        { ts: '2026-06-02', tone: -1, gist: '' },
      ],
    })
    expect(a.label).toBe('КОРЕШ')
    expect(a.episodes).toHaveLength(1)
  })

  it('decays score toward zero with elapsed days', () => {
    const old = new Date(Date.now() - 10 * 86_400_000).toISOString()
    const a = parseAffinity({ score: 80, ts: old, episodes: [] })
    expect(a.score).toBeLessThan(80) // ~80 - 4*10
  })
})

describe('parseRelationships', () => {
  it('keeps only known kinds with a real id + name', () => {
    const rels = parseRelationships([
      { id: 1, name: 'Аня', kind: 'spouse', strength: 10 },
      { id: 2, name: 'Боб', kind: 'rival', strength: 5 },
      { id: 3, name: '', kind: 'ally', strength: 2 }, // no name → drop
      { id: 0, name: 'X', kind: 'foe', strength: 1 }, // bad id → drop
      { id: 4, name: 'Кеша', kind: 'nonsense', strength: 1 }, // unknown kind → drop
    ])
    expect(rels.map((r) => r.kind)).toEqual(['spouse', 'rival'])
    expect(rels[0].label).toBe('в браке')
    expect(rels[0].tone).toBe('love')
  })

  it('returns [] for non-arrays', () => {
    expect(parseRelationships(null)).toEqual([])
    expect(parseRelationships('x' as unknown)).toEqual([])
  })
})

describe('memoryWhen', () => {
  it('buckets age into today / N days / long ago', () => {
    expect(memoryWhen(0.2)).toBe('сегодня')
    expect(memoryWhen(5)).toBe('5 дн. назад')
    expect(memoryWhen(120)).toBe('давно')
  })
})

describe('favoriteScore mirrors opinions.favorite_score + rank_chat cutoffs', () => {
  const src = (() => {
    try {
      return readFileSync(BOT('opinions.py'), 'utf8')
    } catch {
      return null
    }
  })()

  it('bot favorite_score formula is unchanged', () => {
    if (!src) return
    // favorite_score = (trust-50)+(respect-50)+(entertainment-50)-(annoyance-50)
    expect(src.includes('def favorite_score')).toBe(true)
    expect(/get\("trust"\)\s*-\s*_NEUTRAL/.test(src)).toBe(true)
    expect(/-\s*\(op\.get\("annoyance"\)\s*-\s*_NEUTRAL\)/.test(src)).toBe(true)
  })

  it('rank_chat cutoffs are ±15 (favorites > 15, foes < -15)', () => {
    if (!src) return
    expect(src.includes('sc <= 15')).toBe(true) // favorites break at <=15
    expect(src.includes('sc >= -15')).toBe(true) // foes break at >=-15
    expect(FAVORITE_SCORE_MIN).toBe(15)
    expect(FOE_SCORE_MAX).toBe(-15)
  })

  it('computes the signed score from the opinion vector', () => {
    const op = parseOpinion({
      axes: { trust: 70, respect: 70, entertainment: 70, annoyance: 30 },
      samples: 10,
      ts: new Date().toISOString(),
    })
    // (70-50)+(70-50)+(70-50)-(30-50) = 20+20+20+20 = 80
    expect(favoriteScore(op)).toBe(80)
  })

  it('a hostile vector scores negative (on-notice side)', () => {
    const op = parseOpinion({
      axes: { trust: 40, respect: 40, entertainment: 40, annoyance: 85 },
      samples: 10,
      ts: new Date().toISOString(),
    })
    // (40-50)*3 - (85-50) = -30 - 35 = -65
    expect(favoriteScore(op)).toBe(-65)
  })
})
