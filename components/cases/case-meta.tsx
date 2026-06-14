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

/** Short cost ("1 200 еш" / "ключ" / "free") for tight tiles. */
export function caseCostShort(c: CaseView): string {
  if (c.openCostKind === 'currency' && c.openCostAmount > 0) return `${fmt(c.openCostAmount)} еш`
  if (c.consumesKey) return 'ключ'
  return 'бесплатно'
}

export type CaseIndicator = {
  key: string
  label: string
  /** Имя owned-глифа (см. components/ds/icon), не эмодзи. */
  glyph: string
  tone: 'premium' | 'limited' | 'jackpot' | 'gift' | 'seasonal' | 'scarce'
}

/** Status chips shown on a case (premium / scarce / limited / jackpot / gift / seasonal). */
export function caseIndicators(c: CaseView): CaseIndicator[] {
  const out: CaseIndicator[] = []
  if (c.isPremiumCase) out.push({ key: 'premium', label: 'Premium', glyph: 'star', tone: 'premium' })
  // Реальный дефицит важнее всего — «осталось N» из max_global_supply.
  if (c.scarcest && c.scarcest.remaining > 0)
    out.push({
      key: 'scarce',
      label: `осталось ${c.scarcest.remaining.toLocaleString('ru-RU')}`,
      glyph: 'flame',
      tone: 'scarce',
    })
  const left = timeLeftLabel(c.endsInMs)
  if (left) out.push({ key: 'limited', label: left, glyph: 'season', tone: 'limited' })
  if (c.hasJackpot) out.push({ key: 'jackpot', label: 'Джекпот', glyph: 'crown', tone: 'jackpot' })
  if (c.giftChance > 0 && !c.isPremiumCase)
    out.push({ key: 'gift', label: 'Gift', glyph: 'gift', tone: 'gift' })
  if (c.seasonCode && !c.isLimited)
    out.push({ key: 'season', label: 'Сезон', glyph: 'season', tone: 'seasonal' })
  return out
}

export const INDICATOR_CLASS: Record<CaseIndicator['tone'], string> = {
  premium: 'border-[color:var(--accent-gold)]/35 bg-[color:var(--accent-gold)]/10 text-[color:var(--accent-gold)]',
  scarce: 'border-border bg-white/[0.06] text-muted-foreground',
  limited: 'border-border bg-white/[0.06] text-muted-foreground',
  jackpot: 'border-[color:var(--accent-gold)]/35 bg-[color:var(--accent-gold)]/10 text-[color:var(--accent-gold)]',
  gift: 'border-primary/30 bg-primary/10 text-primary',
  seasonal: 'border-border bg-white/[0.06] text-muted-foreground',
}

export { CASE_CATEGORY_META }
