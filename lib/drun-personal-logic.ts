/**
 * Personal Drun — pure presentation logic (Phase B).
 *
 * READ-ONLY mirror of the bot's Drun label/decay logic so the website + Mini App
 * can render "what Drun thinks about this player" WITHOUT a second source of
 * truth and WITHOUT new AI infrastructure. Every threshold/label here is a
 * deliberate copy of the Python that already shipped:
 *
 *   - opinion axes, decay, "standing" title  ↔ voznya-bot/app/features/drun/opinions.py
 *   - affinity score → label                 ↔ voznya-bot/app/features/drun/affinity.py
 *   - relationship edge kinds                 ↔ voznya-bot/app/features/drun/relationships.py
 *   - episode type → label/valence            ↔ voznya-bot/app/features/drun/episodes.py
 *
 * These are guarded against bot drift by test/drun-personal-logic.test.ts (a
 * drift sentinel like world-events.test.ts). Pure, no DB, no `server-only`:
 * importable from both server loaders and unit tests.
 */

// --- Opinion vector (mirror of opinions.py) ---------------------------------

/** 7 opinion axes, order fixed to match opinions.AXES. */
export const OPINION_AXES = [
  'trust',
  'respect',
  'annoyance',
  'interest',
  'chaos',
  'reliability',
  'entertainment',
] as const

export type OpinionAxis = (typeof OPINION_AXES)[number]

const NEUTRAL = 50
const AXIS_MIN = 0
const AXIS_MAX = 100
// opinions._DECAY_PER_DAY — geometric decay of |value-50| toward neutral.
const OPINION_DECAY_PER_DAY = 0.028
// opinions.Opinion.is_formed — need this many samples before a verdict is shown.
const OPINION_FORMED_SAMPLES = 5
// opinions.Opinion.dominant — an axis is "expressed" once it deviates this far.
const OPINION_DOMINANT_DELTA = 18

/** Human-readable RU axis labels (opinions._AXIS_RU). */
export const OPINION_AXIS_RU: Record<OpinionAxis, string> = {
  trust: 'доверие',
  respect: 'уважение',
  annoyance: 'раздражает',
  interest: 'интерес',
  chaos: 'хаос-фактор',
  reliability: 'надёжность',
  entertainment: 'с ним весело',
}

function clampAxis(x: number): number {
  if (Number.isNaN(x)) return NEUTRAL
  return Math.max(AXIS_MIN, Math.min(AXIS_MAX, x))
}

/** Raw opinion JSONB as persisted in ai_profiles.data.opinion. */
export type RawOpinion = {
  axes?: Record<string, unknown> | null
  samples?: unknown
  ts?: unknown
}

export type Opinion = {
  axes: Record<OpinionAxis, number>
  samples: number
  /** Whether the opinion is settled enough to show (mirror of is_formed). */
  isFormed: boolean
}

/** opinions.decay — geometric drift of every axis toward neutral over `days`. */
function decayAxes(axes: Record<OpinionAxis, number>, days: number): Record<OpinionAxis, number> {
  const out = {} as Record<OpinionAxis, number>
  if (days <= 0) {
    for (const ax of OPINION_AXES) out[ax] = clampAxis(axes[ax] ?? NEUTRAL)
    return out
  }
  const keep = Math.pow(1 - OPINION_DECAY_PER_DAY, days)
  for (const ax of OPINION_AXES) {
    const v = axes[ax] ?? NEUTRAL
    out[ax] = clampAxis(NEUTRAL + (v - NEUTRAL) * keep)
  }
  return out
}

/**
 * Parse + decay a stored opinion to "now", mirroring opinions.get_opinion.
 * Returns a neutral, unformed opinion for any missing/garbage input.
 */
export function parseOpinion(raw: RawOpinion | null | undefined, now: Date = new Date()): Opinion {
  const axes = {} as Record<OpinionAxis, number>
  for (const ax of OPINION_AXES) axes[ax] = NEUTRAL
  let samples = 0

  if (raw && typeof raw === 'object') {
    const rawAxes = raw.axes && typeof raw.axes === 'object' ? raw.axes : {}
    for (const ax of OPINION_AXES) {
      const v = Number((rawAxes as Record<string, unknown>)[ax])
      axes[ax] = Number.isFinite(v) ? clampAxis(v) : NEUTRAL
    }
    const s = Number(raw.samples)
    samples = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0

    if (typeof raw.ts === 'string') {
      const last = new Date(raw.ts)
      if (!Number.isNaN(last.getTime())) {
        const days = Math.max(0, (now.getTime() - last.getTime()) / 86_400_000)
        const decayed = decayAxes(axes, days)
        for (const ax of OPINION_AXES) axes[ax] = decayed[ax]
      }
    }
  }

  return { axes, samples, isFormed: samples >= OPINION_FORMED_SAMPLES }
}

export type DominantAxis = {
  axis: OpinionAxis
  label: string
  value: number
  /** true when the axis is above neutral (high trust/respect/… vs low). */
  high: boolean
}

/**
 * Axes deviating noticeably from neutral, strongest first (opinions.dominant).
 * Empty for an unformed opinion — we never show a verdict Drun hasn't formed.
 */
export function dominantAxes(op: Opinion, limit = 3): DominantAxis[] {
  if (!op.isFormed) return []
  const out: DominantAxis[] = []
  for (const ax of OPINION_AXES) {
    const value = op.axes[ax]
    if (Math.abs(value - NEUTRAL) >= OPINION_DOMINANT_DELTA) {
      out.push({ axis: ax, label: OPINION_AXIS_RU[ax], value, high: value >= NEUTRAL })
    }
  }
  out.sort((a, b) => Math.abs(b.value - NEUTRAL) - Math.abs(a.value - NEUTRAL))
  return out.slice(0, limit)
}

/** Social standing title — exact mirror of opinions.Opinion.standing(). */
export function standing(op: Opinion): string {
  if (!op.isFormed) return 'ПРИСМАТРИВАЕТСЯ'
  const trust = op.axes.trust
  const respect = op.axes.respect
  const annoy = op.axes.annoyance
  const ent = op.axes.entertainment
  const chaos = op.axes.chaos
  const rel = op.axes.reliability
  if (annoy >= 70 && respect < 45) return 'БЕСИТ'
  if (trust >= 68 && respect >= 60) return 'ЛЮБИМЧИК'
  if (respect >= 70) return 'УВАЖАЕМЫЙ'
  if (ent >= 70) return 'КЛОУН-ЛЮБИМЕЦ'
  if (chaos >= 72) return 'БЕДОВЫЙ'
  if (trust < 32) return 'НЕ ВНУШАЕТ ДОВЕРИЯ'
  if (rel >= 70 && ent < 45) return 'СКУЧНЫЙ РАБОТЯГА'
  return 'НА ЗАМЕТКЕ'
}

/**
 * Summary "favorite score" — exact mirror of opinions.favorite_score():
 * (trust-50) + (respect-50) + (entertainment-50) - (annoyance-50).
 * Positive → Drun gravitates toward the player; negative → avoids/dislikes.
 * Used to rank the chat into favorites / on-notice lists (mirror of rank_chat).
 */
export function favoriteScore(op: Opinion): number {
  return (
    (op.axes.trust - NEUTRAL) +
    (op.axes.respect - NEUTRAL) +
    (op.axes.entertainment - NEUTRAL) -
    (op.axes.annoyance - NEUTRAL)
  )
}

/** rank_chat cutoffs: favorites need score > +15, foes need score < -15. */
export const FAVORITE_SCORE_MIN = 15
export const FOE_SCORE_MAX = -15

// --- Affinity (mirror of affinity.py) ---------------------------------------

const AFFINITY_MIN = -100
const AFFINITY_MAX = 100
const AFFINITY_DECAY_PER_DAY = 4

export type RawAffinity = {
  score?: unknown
  ts?: unknown
  episodes?: unknown
}

export type AffinityEpisode = {
  ts: string
  tone: number
  gist: string
}

export type Affinity = {
  score: number
  label: string
  episodes: AffinityEpisode[]
}

/** affinity._decayed — |score| shrinks toward 0 by ~4/day. */
function decayAffinity(score: number, days: number): number {
  if (score === 0 || days <= 0) return score
  const shrink = Math.floor(AFFINITY_DECAY_PER_DAY * days)
  return score > 0 ? Math.max(0, score - shrink) : Math.min(0, score + shrink)
}

/** affinity.Affinity.label thresholds. */
export function affinityLabel(score: number): string {
  if (score <= -60) return 'ЛИЧНЫЙ ВРАГ'
  if (score <= -25) return 'НЕДРУГ'
  if (score < 25) return 'НЕЙТРАЛ'
  if (score < 60) return 'ПРИЯТЕЛЬ'
  return 'КОРЕШ'
}

/** Parse + decay stored affinity to "now", mirroring affinity.get_affinity. */
export function parseAffinity(raw: RawAffinity | null | undefined, now: Date = new Date()): Affinity {
  let score = 0
  let episodes: AffinityEpisode[] = []
  if (raw && typeof raw === 'object') {
    const s = Number(raw.score)
    score = Number.isFinite(s) ? Math.floor(s) : 0
    if (typeof raw.ts === 'string') {
      const last = new Date(raw.ts)
      if (!Number.isNaN(last.getTime())) {
        const days = Math.max(0, (now.getTime() - last.getTime()) / 86_400_000)
        score = decayAffinity(score, days)
      }
    }
    if (Array.isArray(raw.episodes)) {
      episodes = raw.episodes
        .map((e) => {
          const obj = (e ?? {}) as Record<string, unknown>
          const tone = Number(obj.tone)
          return {
            ts: typeof obj.ts === 'string' ? obj.ts : '',
            tone: Number.isFinite(tone) ? Math.trunc(tone) : 0,
            gist: typeof obj.gist === 'string' ? obj.gist : '',
          }
        })
        .filter((e) => e.gist)
    }
  }
  score = Math.max(AFFINITY_MIN, Math.min(AFFINITY_MAX, score))
  return { score, label: affinityLabel(score), episodes }
}

// --- Relationships (mirror of relationships.py edge kinds) ------------------

export type RelationshipKind = 'spouse' | 'rival' | 'ally' | 'foe' | 'buddy' | 'gifter'

/** Stored relationship edge as persisted by profile.refresh_profile. */
export type RawRelationship = {
  id?: unknown
  name?: unknown
  kind?: unknown
  strength?: unknown
}

export type Relationship = {
  id: number
  name: string
  kind: RelationshipKind
  strength: number
  /** Player-facing RU tag. */
  label: string
  /** Glyph hint resolved by the UI. */
  tone: 'love' | 'rival' | 'ally' | 'foe' | 'buddy' | 'gift'
}

const REL_LABEL: Record<RelationshipKind, { label: string; tone: Relationship['tone'] }> = {
  spouse: { label: 'в браке', tone: 'love' },
  rival: { label: 'соперник', tone: 'rival' },
  ally: { label: 'союзник', tone: 'ally' },
  foe: { label: 'недруг', tone: 'foe' },
  buddy: { label: 'кореш', tone: 'buddy' },
  gifter: { label: 'дарит подарки', tone: 'gift' },
}

const REL_KINDS = new Set<string>(Object.keys(REL_LABEL))

/** Parse stored relationship edges into player-facing tags (skips garbage). */
export function parseRelationships(raw: unknown): Relationship[] {
  if (!Array.isArray(raw)) return []
  const out: Relationship[] = []
  for (const e of raw) {
    const obj = (e ?? {}) as RawRelationship
    const kind = String(obj.kind ?? '')
    if (!REL_KINDS.has(kind)) continue
    const id = Number(obj.id)
    const name = typeof obj.name === 'string' ? obj.name.trim() : ''
    if (!Number.isFinite(id) || id <= 0 || !name) continue
    const strength = Number(obj.strength)
    const meta = REL_LABEL[kind as RelationshipKind]
    out.push({
      id: Math.floor(id),
      name,
      kind: kind as RelationshipKind,
      strength: Number.isFinite(strength) ? Math.floor(strength) : 1,
      label: meta.label,
      tone: meta.tone,
    })
  }
  return out
}

// --- Episodes (mirror of episodes.py taxonomy) ------------------------------

/** code → { label, valence } from episodes._TYPES. */
export const EPISODE_TYPES: Record<string, { label: string; valence: number }> = {
  betrayal: { label: 'предательство', valence: -1 },
  broken_promise: { label: 'слитое обещание', valence: -1 },
  promise: { label: 'обещание', valence: 0 },
  kept_promise: { label: 'сдержал слово', valence: 1 },
  support: { label: 'поддержка', valence: 1 },
  defense: { label: 'заступился', valence: 1 },
  generosity: { label: 'щедрость', valence: 1 },
  leadership: { label: 'лидерство', valence: 1 },
  humiliation: { label: 'унижение', valence: -1 },
  challenge: { label: 'вызов', valence: 0 },
  rivalry_escalation: { label: 'эскалация вражды', valence: 0 },
  reconciliation: { label: 'примирение', valence: 1 },
  whining: { label: 'нытьё', valence: -1 },
}

const EPISODE_KIND_PREFIX = 'episode:'

/** episodes.code_from_kind — strip the "episode:" prefix from an ai_memories kind. */
export function episodeCodeFromKind(kind: string): string {
  return kind.startsWith(EPISODE_KIND_PREFIX) ? kind.slice(EPISODE_KIND_PREFIX.length) : kind
}

export type NotableMemory = {
  id: string
  /** Episode code if this row is a typed episode, else null (plain fact/trait). */
  code: string | null
  /** Human label: episode label, or "память" for a plain fact. */
  label: string
  gist: string
  /** +1 positive / -1 negative / 0 neutral. */
  valence: number
  /** significance/weight 1..3. */
  significance: number
  /** Age in whole days from created_at. */
  ageDays: number
}

/** "сегодня" / "N дн. назад" / "давно" — mirror of episodes.render_block wording. */
export function memoryWhen(ageDays: number): string {
  if (ageDays < 1) return 'сегодня'
  if (ageDays < 60) return `${Math.floor(ageDays)} дн. назад`
  return 'давно'
}
