import { CASE_CATEGORY_META, timeLeftLabel, type CaseView } from '@/lib/cases-ux'

/**
 * Shared presentation helpers for the Stage 3 case surfaces. Pure formatting,
 * no data access. Kept here so the hub tile, featured card and detail sheet all
 * speak the same language (cost, category, limited indicators).
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

/** Cost label for a case ("1 200 ешек" / "нужен ключ" / "бесплатно"). */
export function caseCostLabel(c: CaseView): string {
  if (c.openCostKind === 'currency' && c.openCostAmount > 0) return `${fmt(c.openCostAmount)} ешек`
  if (c.consumesKey) return 'нужен ключ'
  return 'бесплатно'
}

/** Short cost ("1 200 🥚" / "ключ" / "free") for tight tiles. */
export function caseCostShort(c: CaseView): string {
  if (c.openCostKind === 'currency' && c.openCostAmount > 0) return `${fmt(c.openCostAmount)} 🥚`
  if (c.consumesKey) return 'ключ'
  return 'бесплатно'
}

export type CaseIndicator = {
  key: string
  label: string
  glyph: string
  tone: 'premium' | 'limited' | 'jackpot' | 'gift' | 'seasonal'
}

/** Status chips shown on a case (premium / limited / jackpot / gift / seasonal). */
export function caseIndicators(c: CaseView): CaseIndicator[] {
  const out: CaseIndicator[] = []
  if (c.isPremiumCase) out.push({ key: 'premium', label: 'Premium', glyph: '⭐', tone: 'premium' })
  const left = timeLeftLabel(c.endsInMs)
  if (left) out.push({ key: 'limited', label: left, glyph: '⏳', tone: 'limited' })
  if (c.hasJackpot) out.push({ key: 'jackpot', label: 'Джекпот', glyph: '💎', tone: 'jackpot' })
  if (c.giftChance > 0 && !c.isPremiumCase)
    out.push({ key: 'gift', label: 'Gift', glyph: '🎁', tone: 'gift' })
  if (c.seasonCode && !c.isLimited)
    out.push({ key: 'season', label: 'Сезон', glyph: '🍂', tone: 'seasonal' })
  return out
}

export const INDICATOR_CLASS: Record<CaseIndicator['tone'], string> = {
  premium: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  limited: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
  jackpot: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  gift: 'border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200',
  seasonal: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
}

export { CASE_CATEGORY_META }
