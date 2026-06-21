import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { query } from '@/lib/db'
import {
  parseOpinion,
  parseAffinity,
  parseRelationships,
  standing,
  dominantAxes,
  episodeCodeFromKind,
  EPISODE_TYPES,
  type Opinion,
  type Affinity,
  type Relationship,
  type DominantAxis,
  type NotableMemory,
} from '@/lib/drun-personal-logic'

/**
 * Personal Drun — read-only profile summary loader (Phase B).
 *
 * Surfaces what Drun ALREADY knows about a player on the website + Mini App
 * profile, sourced entirely from tables the bot owns and writes:
 *
 *   - `ai_profiles` (one row per player): summary, speech_style, and the `data`
 *     JSONB that holds the opinion vector, affinity + its episode journal,
 *     relationship edges, traits, topics and self-facts (built by the bot's
 *     profile sweep — voznya-bot/app/features/drun/profile.py).
 *   - `ai_memories` (subject_id = player): typed social episodes
 *     (kind='episode:*') Drun remembers about this player.
 *
 * STRICTLY READ-ONLY. No economy writes, no new authority, no new AI infra —
 * just a second reader of bot-owned state (Model 2 untouched). Cached for 60s
 * (`unstable_cache`) and FAIL-SILENT: a missing key, an un-migrated DB, an empty
 * profile or any error degrades to `null`, so the profile page simply omits the
 * section — never an error. Drun looks quiet, exactly like the existing loaders.
 */

/** What Drun thinks: the settled verdict + the axes driving it. */
export type DrunOpinionView = {
  standing: string
  dominant: DominantAxis[]
  samples: number
}

/** The assembled "Personal Drun" payload for one player. */
export type PersonalDrun = {
  /** Drun's 1-3 phrase portrait (ai_profiles.summary). */
  summary: string | null
  /** How the player writes, in Drun's words (ai_profiles.speech_style). */
  speechStyle: string | null
  /** Short personality traits Drun distilled (data.traits). */
  traits: string[]
  /** Topics the player gravitates to (data.topics). */
  topics: string[]
  /** Facts the player said about themselves (data.self_facts). */
  selfFacts: string[]
  /** "What Drun thinks" — only present once the opinion is formed. */
  opinion: DrunOpinionView | null
  /** Drun's personal warmth/hostility toward the player + recent moments. */
  affinity: {
    score: number
    label: string
    episodes: Affinity['episodes']
  } | null
  /** Relationship tags (spouse/rival/ally/foe/buddy/gifter). */
  relationships: Relationship[]
  /** Notable memories — typed social episodes Drun recalls. */
  memories: NotableMemory[]
  /** True if there is at least one section worth rendering. */
  hasContent: boolean
}

type ProfileRow = {
  summary: string | null
  speech_style: string | null
  data: unknown
  refreshed_at: string | null
}

type MemoryRow = {
  id: string
  kind: string
  fact: string
  weight: number | string
  created_at: string
}

const MAX_MEMORIES = 5
const MAX_AFFINITY_EPISODES = 4
const MAX_TRAITS = 6
const MAX_TOPICS = 6
const MAX_SELF_FACTS = 4
const MAX_RELATIONSHIPS = 6

function asStringList(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const v of value) {
    if (typeof v === 'string') {
      const t = v.trim()
      if (t) out.push(t)
    }
    if (out.length >= cap) break
  }
  return out
}

/**
 * Load the notable social episodes Drun remembers about a player. These live in
 * `ai_memories` with kind='episode:<type>' and subject_id=<player>, weight =
 * significance, expires_at scaled by significance (episodes.py). Newest/most
 * significant first; expired rows excluded. [] on any error.
 */
async function loadMemories(userId: number, now: Date): Promise<NotableMemory[]> {
  try {
    const rows = await query<MemoryRow>(
      `SELECT id, kind, fact, weight, created_at
         FROM ai_memories
        WHERE subject_id = $1
          AND kind LIKE 'episode:%'
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY weight DESC, created_at DESC
        LIMIT $2`,
      [userId, MAX_MEMORIES],
    )
    return rows.map((r) => {
      const code = episodeCodeFromKind(r.kind)
      const meta = EPISODE_TYPES[code]
      const created = new Date(r.created_at)
      const ageDays = Number.isNaN(created.getTime())
        ? 0
        : Math.max(0, (now.getTime() - created.getTime()) / 86_400_000)
      const weight = Number(r.weight)
      return {
        id: String(r.id),
        code,
        label: meta ? meta.label : 'память',
        gist: r.fact,
        valence: meta ? meta.valence : 0,
        significance: Number.isFinite(weight) ? Math.max(1, Math.min(3, Math.floor(weight))) : 1,
        ageDays,
      }
    })
  } catch {
    return []
  }
}

/**
 * Resolve the player's CURRENT spouse live from `marriages` (active =
 * divorced_at IS NULL), returning the partner edge or null. The snapshot in
 * `ai_profiles.data.relationships` can lag a fresh marriage/divorce by up to a
 * profile-sweep cycle, so a stale "в браке с X" is exactly the kind of identity
 * error this whole pass is fixing — we always trust the live table for spouse.
 * Fail-silent: returns null on any error / no marriages table.
 */
async function loadLiveSpouse(userId: number): Promise<Relationship | null> {
  try {
    const rows = await query<{ partner_id: string; first_name: string | null; username: string | null }>(
      `SELECT CASE WHEN m.user_id_1 = $1 THEN m.user_id_2 ELSE m.user_id_1 END AS partner_id,
              u.first_name, u.username
         FROM marriages m
         LEFT JOIN users u
           ON u.user_id = CASE WHEN m.user_id_1 = $1 THEN m.user_id_2 ELSE m.user_id_1 END
        WHERE (m.user_id_1 = $1 OR m.user_id_2 = $1)
          AND m.divorced_at IS NULL
        ORDER BY m.married_at DESC
        LIMIT 1`,
      [userId],
    )
    const r = rows[0]
    if (!r) return null
    const id = Number(r.partner_id)
    if (!Number.isFinite(id) || id <= 0) return null
    const name =
      (r.first_name && r.first_name.trim()) ||
      (r.username && `@${r.username.trim()}`) ||
      'Игрок'
    return { id, name, kind: 'spouse', strength: 10, label: 'в браке', tone: 'love' }
  } catch {
    return null
  }
}

async function _getPersonalDrun(userId: number): Promise<PersonalDrun | null> {
  if (!Number.isFinite(userId) || userId <= 0) return null

  const now = new Date()

  // The reads are independent → run them in parallel so a cache miss costs
  // one round-trip of latency, not three. Each degrades to its empty value on
  // any error (un-migrated DB / outage / Drun disabled) — fail-silent.
  const [profileRow, memories, liveSpouse] = await Promise.all([
    query<ProfileRow>(
      `SELECT summary, speech_style, data, refreshed_at
         FROM ai_profiles
        WHERE user_id = $1
        LIMIT 1`,
      [userId],
    )
      .then((rows) => rows[0] ?? null)
      .catch(() => null),
    loadMemories(userId, now),
    loadLiveSpouse(userId),
  ])

  // No profile row AND no episodes → Drun has nothing to say about this player.
  if (!profileRow && memories.length === 0) return null

  const data =
    profileRow && profileRow.data && typeof profileRow.data === 'object'
      ? (profileRow.data as Record<string, unknown>)
      : {}

  // Opinion → "what Drun thinks". Only surfaced once the opinion is FORMED
  // (>=5 samples), mirroring the bot which won't voice an unsettled verdict.
  const op: Opinion = parseOpinion(data.opinion as never, now)
  const dominant = dominantAxes(op)
  const opinionView: DrunOpinionView | null = op.isFormed
    ? { standing: standing(op), dominant, samples: op.samples }
    : null

  // Affinity → Drun's personal warmth/hostility + the recent moments behind it.
  const aff: Affinity = parseAffinity(data.affinity as never, now)
  // NEUTRAL with no episodes is not worth a section.
  const affinityView =
    aff.label !== 'НЕЙТРАЛ' || aff.episodes.length > 0
      ? {
          score: aff.score,
          label: aff.label,
          episodes: aff.episodes.slice(-MAX_AFFINITY_EPISODES).reverse(),
        }
      : null

  // Relationships: trust the LIVE marriages table for spouse, never the
  // possibly-stale snapshot. Drop any snapshot 'spouse' edge and prepend the
  // live one (if currently married). Non-spouse edges (rival/buddy/…) still come
  // from the snapshot — they're lower-stakes and not identity-defining.
  const snapshotRels = parseRelationships(data.relationships).filter(
    (r) => r.kind !== 'spouse',
  )
  const relationships = (liveSpouse ? [liveSpouse, ...snapshotRels] : snapshotRels).slice(
    0,
    MAX_RELATIONSHIPS,
  )
  const traits = asStringList(data.traits, MAX_TRAITS)
  const topics = asStringList(data.topics, MAX_TOPICS)
  const selfFacts = asStringList(data.self_facts, MAX_SELF_FACTS)

  const summary = profileRow?.summary?.trim() || null
  const speechStyle = profileRow?.speech_style?.trim() || null

  const hasContent = Boolean(
    summary ||
      speechStyle ||
      opinionView ||
      affinityView ||
      relationships.length > 0 ||
      memories.length > 0 ||
      traits.length > 0 ||
      topics.length > 0 ||
      selfFacts.length > 0,
  )

  if (!hasContent) return null

  return {
    summary,
    speechStyle,
    traits,
    topics,
    selfFacts,
    opinion: opinionView,
    affinity: affinityView,
    relationships,
    memories,
    hasContent,
  }
}

// NOTE: two layers of caching, mirroring the other site loaders:
//  - unstable_cache (60s, tagged) shares the result ACROSS requests/users so a
//    popular profile doesn't re-hit the DB on every visit; and
//  - React cache() dedupes repeated calls for the SAME userId WITHIN one server
//    request (e.g. generateMetadata + the page body both ask for it).
const _getPersonalDrunCached = unstable_cache(
  (userId: number) => _getPersonalDrun(userId),
  ['drun-personal'],
  { revalidate: 60, tags: ['drun-personal'] },
)

/**
 * Cached, fail-silent accessor. Returns `null` when Drun has nothing to show —
 * callers render nothing in that case (the section simply disappears).
 */
export const getPersonalDrun = cache((userId: number) => _getPersonalDrunCached(userId))
