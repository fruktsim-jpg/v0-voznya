import type { GlyphName } from '@/components/ds/icon'

/**
 * Screen Signatures (PHASE C — C3 Surface Modernization).
 *
 * Every internal screen shares the same shell (WorldBackdrop, header, nav), which
 * is correct for cohesion — but pre-C3 they were *indistinguishable*: identical
 * violet masthead, identical section rhythm. A premium platform gives each place
 * a personality while staying inside one world.
 *
 * The lever is the existing semantic accent palette (globals.css §accent), whose
 * meanings are already fixed across the product:
 *   indigo  → progression / cases / "open & climb"
 *   pink    → social / gifts / community
 *   teal    → economy / live / positive motion
 *   gold    → rewards / casino / fortune
 *   violet  → prestige / season / brand core
 *   red     → mythic / jackpot / danger
 *
 * A signature is purely presentational: a CSS accent variable + a short kicker
 * (eyebrow) line for the masthead. No data, no behavior. This keeps each screen
 * recognizably itself (cases feel like cases, gifts feel like gifts) without
 * forking the design system per page.
 */
export type ScreenAccent = 'indigo' | 'pink' | 'teal' | 'gold' | 'violet' | 'red'

export type ScreenSignature = {
  /** CSS custom-property reference for this screen's accent. */
  accentVar: string
  /** Suggested masthead glyph (functional register). */
  glyph: GlyphName
  /** Short eyebrow shown above/with the title — sets the screen's tone. */
  kicker: string
}

const ACCENT_VARS: Record<ScreenAccent, string> = {
  indigo: 'var(--accent-indigo)',
  pink: 'var(--accent-pink)',
  teal: 'var(--accent-teal)',
  gold: 'var(--accent-gold)',
  violet: 'var(--accent-violet)',
  red: 'var(--accent-red)',
}

export function accentVar(accent: ScreenAccent): string {
  return ACCENT_VARS[accent]
}

/** Canonical per-screen signatures, keyed by route segment. */
export const SCREEN_SIGNATURES = {
  cases: { accent: 'indigo', glyph: 'case', kicker: 'Открывай и поднимайся' },
  inventory: { accent: 'indigo', glyph: 'inventory', kicker: 'Твоя коллекция' },
  gifts: { accent: 'pink', glyph: 'gift', kicker: 'Подарки сообщества' },
  live: { accent: 'teal', glyph: 'flame', kicker: 'Жизнь Возни прямо сейчас' },
  casino: { accent: 'gold', glyph: 'dice', kicker: 'Азарт внутри экосистемы' },
  season: { accent: 'violet', glyph: 'season', kicker: 'Сезонная гонка' },
} satisfies Record<string, { accent: ScreenAccent; glyph: GlyphName; kicker: string }>

export type ScreenKey = keyof typeof SCREEN_SIGNATURES
