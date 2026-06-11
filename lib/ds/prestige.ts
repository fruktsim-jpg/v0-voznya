/**
 * VOZNYA Prestige System (PHASE A — A4).
 *
 * THE missing layer. Before A4, "prestige" was three disconnected ladders —
 * MMR rank (lib/mmr.ts), season division (lib/season.ts), earnings title
 * (lib/voznya-bot.ts) — each rendered as the SAME flat emoji+text pill. A 🥉
 * Bronze looked identical to a 👑 Архидрун. That is the opposite of status.
 *
 * A4 unifies them onto ONE ordered scale of TIER WORLDS. Each tier is a distinct
 * visual environment — color, gradient, glow, frame, aura, material, motion —
 * so prestige is legible INSTANTLY, before any text is read:
 *
 *   stone → iron → gold → platinum → diamond → master → apex
 *
 * Design law (owner): "Bronze should not feel like Diamond. Diamond should not
 * feel like Master. Master should not feel like Архидрун." So intensity ESCALATES
 * non-linearly: low tiers are calm/earthy/matte (unproven), high tiers gain
 * brightness, then glow, then animated auras, then the mythic apex world.
 *
 * Pure presentation. SSR-safe AND client-safe: this module must stay free of
 * server-only imports (no `lib/db`, no `lib/season` which is `server-only`).
 * It is consumed by client components (PlayerContextBar, TopRich, TitlesLadder).
 * Division/MMR rank NAMES are referenced as string keys, so we never import the
 * server-only season layer — tier THRESHOLDS still live in mmr.ts / season.ts.
 */

/** Ordered prestige worlds. Index = rank (0 lowest → 6 apex). */
export type PrestigeTierKey =
  | 'stone'
  | 'iron'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'apex'

export const PRESTIGE_ORDER: PrestigeTierKey[] = [
  'stone',
  'iron',
  'gold',
  'platinum',
  'diamond',
  'master',
  'apex',
]

export type PrestigeTier = {
  key: PrestigeTierKey
  /** 0..6 — for comparison/sorting and intensity scaling. */
  index: number
  /** Short human label for the WORLD (not the rank name). */
  worldLabel: string
  /** Base accent color (border / text / icon). */
  color: string
  /** Secondary color for two-stop gradients / sheen. */
  color2: string
  /** Linear gradient for large surfaces (frames, banners, tier worlds). */
  gradient: string
  /** Ambient radial "aura" behind a prestige subject (avatar/medallion). */
  aura: string
  /** box-shadow glow ('' = none; low tiers stay matte = unproven). */
  glow: string
  /** Material feel — drives surface texture cues in components. */
  material: 'matte' | 'metal' | 'crystal' | 'royal' | 'mythic'
  /** Does this tier earn living motion (sweep/pulse)? High tiers only. */
  animated: boolean
  /** Tailwind ring class for the avatar/frame border. */
  ringClass: string
}

/**
 * The seven worlds. Colors are chosen to read as DIFFERENT environments, not
 * shades of one hue: earthy bronze → cool steel → warm gold → teal crystal →
 * ice-blue brilliance → royal violet → mythic apex (violet/red/gold).
 */
export const PRESTIGE_TIERS: Record<PrestigeTierKey, PrestigeTier> = {
  stone: {
    key: 'stone',
    index: 0,
    worldLabel: 'Камень',
    color: '#B0764A',
    color2: '#8A5A38',
    gradient: 'linear-gradient(135deg, rgba(176,118,74,0.20) 0%, rgba(138,90,56,0.05) 100%)',
    aura: 'radial-gradient(circle at 50% 40%, rgba(176,118,74,0.18), transparent 70%)',
    glow: '',
    material: 'matte',
    animated: false,
    ringClass: 'ring-[#B0764A]/40',
  },
  iron: {
    key: 'iron',
    index: 1,
    worldLabel: 'Сталь',
    color: '#9FB2C4',
    color2: '#6E8295',
    gradient: 'linear-gradient(135deg, rgba(159,178,196,0.24) 0%, rgba(110,130,149,0.06) 100%)',
    aura: 'radial-gradient(circle at 50% 40%, rgba(159,178,196,0.22), transparent 70%)',
    glow: '0 0 14px -5px rgba(159,178,196,0.45)',
    material: 'metal',
    animated: false,
    ringClass: 'ring-[#9FB2C4]/50',
  },
  gold: {
    key: 'gold',
    index: 2,
    worldLabel: 'Золото',
    color: '#FFC53D',
    color2: '#E0961B',
    gradient: 'linear-gradient(135deg, rgba(255,197,61,0.32) 0%, rgba(224,150,27,0.08) 100%)',
    aura: 'radial-gradient(circle at 50% 40%, rgba(255,197,61,0.30), transparent 72%)',
    glow: '0 0 20px -4px rgba(255,197,61,0.55)',
    material: 'metal',
    animated: false,
    ringClass: 'ring-[#FFC53D]/55',
  },
  platinum: {
    key: 'platinum',
    index: 3,
    worldLabel: 'Платина',
    color: '#4FD1C5',
    color2: '#2C9C9C',
    gradient: 'linear-gradient(135deg, rgba(79,209,197,0.34) 0%, rgba(44,156,156,0.08) 100%)',
    aura: 'radial-gradient(circle at 50% 40%, rgba(79,209,197,0.32), transparent 72%)',
    glow: '0 0 24px -3px rgba(79,209,197,0.55)',
    material: 'crystal',
    animated: true,
    ringClass: 'ring-[#4FD1C5]/60',
  },
  diamond: {
    key: 'diamond',
    index: 4,
    worldLabel: 'Алмаз',
    color: '#5AC8FF',
    color2: '#2E8BE6',
    gradient: 'linear-gradient(135deg, rgba(90,200,255,0.38) 0%, rgba(46,139,230,0.10) 100%)',
    aura: 'radial-gradient(circle at 50% 38%, rgba(90,200,255,0.38), transparent 72%)',
    glow: '0 0 28px -2px rgba(90,200,255,0.62)',
    material: 'crystal',
    animated: true,
    ringClass: 'ring-[#5AC8FF]/65',
  },
  master: {
    key: 'master',
    index: 5,
    worldLabel: 'Мастер',
    color: '#A879FF',
    color2: '#7A3FE0',
    gradient: 'linear-gradient(135deg, rgba(168,121,255,0.42) 0%, rgba(122,63,224,0.12) 100%)',
    aura: 'radial-gradient(circle at 50% 38%, rgba(168,121,255,0.42), transparent 72%)',
    glow: '0 0 32px -2px rgba(168,121,255,0.66)',
    material: 'royal',
    animated: true,
    ringClass: 'ring-[#A879FF]/70',
  },
  apex: {
    key: 'apex',
    index: 6,
    worldLabel: 'Вершина',
    color: '#FF6A3D',
    color2: '#FFD700',
    // The apex is a WORLD of its own — violet → red → gold, the platform's most
    // expensive accent (shared spirit with MYTHIC_GRADIENT in lib/rarity.ts).
    gradient: 'linear-gradient(135deg, #8847FF 0%, #EB4B4B 50%, #FFD700 100%)',
    aura: 'radial-gradient(circle at 50% 35%, rgba(235,75,75,0.40), rgba(136,71,255,0.18) 45%, transparent 75%)',
    glow: '0 0 40px -1px rgba(235,75,75,0.6)',
    material: 'mythic',
    animated: true,
    ringClass: 'ring-[#FF6A3D]/75',
  },
}

export function prestigeTier(key: PrestigeTierKey): PrestigeTier {
  return PRESTIGE_TIERS[key]
}

/** Higher of two tiers (for "best prestige" displays). */
export function maxPrestige(a: PrestigeTierKey, b: PrestigeTierKey): PrestigeTierKey {
  return PRESTIGE_TIERS[a].index >= PRESTIGE_TIERS[b].index ? a : b
}

// --- Ladder → tier-world mappings -------------------------------------------
// Keyed by the canonical NAMES from the bot-mirrored sources, so adding/renaming
// a rank is a one-line change here and never silently mis-tiers.

/**
 * Season divisions (lib/season.ts): Bronze→Master map 1:1 onto the first six
 * worlds; the scale's `apex` is reserved for the very top of the MMR ladder so
 * a seasonal Master and a lifetime Архидрун don't read as the same ceiling.
 */
const DIVISION_TIER: Record<string, PrestigeTierKey> = {
  Bronze: 'stone',
  Silver: 'iron',
  Gold: 'gold',
  Platinum: 'platinum',
  Diamond: 'diamond',
  Master: 'master',
}

/**
 * MMR ranks (lib/mmr.ts, 6 lifetime tiers). Lifetime prestige tops out at the
 * APEX world (Архидрун / Боженька Возни) — these are the rarest players, so they
 * get the mythic world. Platinum is skipped here on purpose: the MMR ladder
 * jumps from gold-feel to crystal brilliance to royal to apex.
 */
const MMR_RANK_TIER: Record<string, PrestigeTierKey> = {
  'Залётный': 'stone',
  'Бродяга Утрехта': 'iron',
  'Свой в Зволле': 'gold',
  'Котейший': 'diamond',
  'Архидрун': 'master',
  'Боженька Возни': 'apex',
}

/** Resolve a season division (by name) to its prestige world. */
export function prestigeForDivision(divisionName: string): PrestigeTier {
  return PRESTIGE_TIERS[DIVISION_TIER[divisionName] ?? 'stone']
}

/** Resolve an MMR rank (by name) to its prestige world. */
export function prestigeForMmrRank(rankName: string): PrestigeTier {
  return PRESTIGE_TIERS[MMR_RANK_TIER[rankName] ?? 'stone']
}

/**
 * Resolve an earnings title to a prestige world by its position in the ladder
 * (lib/voznya-bot.ts TITLES has 11 entries — too many for 1:1, so we scale the
 * index across the 7 worlds). `total` defaults to a sane 11 if not provided.
 */
export function prestigeForTitleIndex(index: number, total: number): PrestigeTier {
  if (total <= 1) return PRESTIGE_TIERS.stone
  const ratio = Math.min(1, Math.max(0, index / (total - 1)))
  const tierIdx = Math.round(ratio * (PRESTIGE_ORDER.length - 1))
  return PRESTIGE_TIERS[PRESTIGE_ORDER[tierIdx]]
}

/** Tier world for the highest MMR rank ("max ceiling" UI). Apex is the rarest. */
export const MMR_TOP_TIER = PRESTIGE_TIERS.apex
/** Tier world for the highest season division (Master). */
export const DIVISION_TOP_TIER = PRESTIGE_TIERS.master
