// =============================================================================
// VOZNYA — CASE HEALTH (Command Center, operator interpretation)
// =============================================================================
//
// Pure interpretation layer over CaseLiveStats (lib/economy-analytics.ts). Same
// philosophy as EconomyHealth: turn raw per-case numbers into a one-glance
// operator verdict — healthy / overperforming / underperforming / too generous /
// too expensive / low engagement / needs review — so the operator never has to
// inspect 20 cases by hand. No data access, no mutations; client+server safe.
//
// HONESTY NOTE: `actualRtp` from the ledger counts only CURRENCY returns, not the
// resale value of item/gift drops, so an item-heavy case reads artificially low.
// We therefore only call out RTP extremes for cases whose returns are mostly
// currency, and otherwise lean on engagement + jackpot/limited signals. Verdicts
// are heuristic operator hints, never automated economy actions.
// =============================================================================

import type { CaseLiveStats } from '@/lib/economy-analytics'

export type CaseHealthFlag =
  | 'healthy'
  | 'overperforming'
  | 'underperforming'
  | 'too_generous'
  | 'too_expensive'
  | 'low_engagement'
  | 'high_engagement'
  | 'needs_review'
  | 'no_data'

export type CaseHealth = {
  caseCode: string
  name: string
  openingsToday: number
  openingsTotal: number
  eshkiSpent: number
  /** currency-only RTP from the ledger (see honesty note) */
  currencyRtp: number | null
  premiumDrops: number
  limitedDrops: number
  jackpotDrops: number
  /** share of total openings that happened in the last 24h (momentum) */
  todayShare: number
  flags: CaseHealthFlag[]
  /** primary verdict (first/most important flag) */
  verdict: CaseHealthFlag
  /** short human reason for the verdict */
  reason: string
}

export const FLAG_META: Record<CaseHealthFlag, { label: string; tone: string }> = {
  healthy: { label: 'Здоров', tone: 'text-emerald-300' },
  overperforming: { label: 'Сверхпопулярен', tone: 'text-emerald-300' },
  underperforming: { label: 'Слабый', tone: 'text-rose-300' },
  too_generous: { label: 'Слишком щедрый', tone: 'text-amber-300' },
  too_expensive: { label: 'Дорогой/жадный', tone: 'text-sky-300' },
  low_engagement: { label: 'Мало открытий', tone: 'text-rose-300' },
  high_engagement: { label: 'Высокий спрос', tone: 'text-emerald-300' },
  needs_review: { label: 'Нужна проверка', tone: 'text-amber-300' },
  no_data: { label: 'Нет данных', tone: 'text-muted-foreground' },
}

export type CaseNamed = { item_code: string; name: string }

/**
 * Interpret one case. `medianOpenings` and `totalOpeningsAll` give relative
 * context so "underperforming" means relative to the platform, not absolute.
 */
function interpretCase(
  stats: CaseLiveStats | undefined,
  name: string,
  ctx: { medianOpenings: number; maxOpenings: number },
): CaseHealth {
  const base = {
    caseCode: stats?.caseCode ?? '',
    name,
    openingsToday: stats?.openingsToday ?? 0,
    openingsTotal: stats?.openingsTotal ?? 0,
    eshkiSpent: stats?.eshkiSpent ?? 0,
    currencyRtp: stats?.actualRtp ?? null,
    premiumDrops: stats?.premiumDrops ?? 0,
    limitedDrops: stats?.limitedDrops ?? 0,
    jackpotDrops: stats?.jackpotDrops ?? 0,
    todayShare: 0,
  }

  if (!stats || base.openingsTotal === 0) {
    return { ...base, flags: ['no_data'], verdict: 'no_data', reason: 'Ещё не открывали' }
  }

  base.todayShare = base.openingsTotal > 0 ? base.openingsToday / base.openingsTotal : 0
  const flags: CaseHealthFlag[] = []

  // Engagement, relative to platform.
  if (base.openingsTotal >= Math.max(ctx.medianOpenings * 3, 50)) flags.push('overperforming')
  else if (base.openingsTotal >= ctx.medianOpenings * 1.5) flags.push('high_engagement')
  if (base.openingsTotal > 0 && base.openingsTotal < Math.max(1, ctx.medianOpenings * 0.25)) {
    flags.push('low_engagement')
  }

  // RTP extremes — only trustworthy when returns are mostly currency. We proxy
  // "mostly currency" by having no premium/limited/jackpot item drops recorded.
  const itemHeavy = base.premiumDrops + base.limitedDrops > 0
  if (base.currencyRtp != null && !itemHeavy) {
    if (base.currencyRtp > 1.0) flags.push('too_generous')
    else if (base.currencyRtp < 0.35 && base.openingsTotal >= ctx.medianOpenings) {
      flags.push('too_expensive')
    }
  }

  // Momentum hint: a case with strong recent share but low lifetime is rising.
  if (base.todayShare >= 0.4 && base.openingsTotal >= 10 && !flags.includes('overperforming')) {
    flags.push('high_engagement')
  }

  let verdict: CaseHealthFlag
  let reason: string
  if (flags.includes('too_generous')) {
    verdict = 'too_generous'
    reason = `RTP ${Math.round((base.currencyRtp ?? 0) * 100)}% по валюте — кейс отдаёт больше, чем берёт`
  } else if (flags.includes('too_expensive')) {
    verdict = 'too_expensive'
    reason = `RTP ${Math.round((base.currencyRtp ?? 0) * 100)}% по валюте при высоком спросе — возможно, жадный`
  } else if (flags.includes('low_engagement')) {
    verdict = 'low_engagement'
    reason = `Всего ${base.openingsTotal} открытий — ниже медианы платформы`
  } else if (flags.includes('overperforming')) {
    verdict = 'overperforming'
    reason = `${base.openingsTotal} открытий — один из самых популярных`
  } else if (flags.includes('high_engagement')) {
    verdict = 'high_engagement'
    reason = `Высокий спрос (${base.openingsTotal} открытий, ${Math.round(base.todayShare * 100)}% за сутки)`
  } else {
    verdict = 'healthy'
    reason = 'В пределах нормы'
  }

  return { ...base, flags: flags.length ? flags : ['healthy'], verdict, reason }
}

export type CasesHealthReport = {
  cases: CaseHealth[]
  /** cases needing attention first (generous/expensive/low engagement) */
  attention: CaseHealth[]
  topByOpenings: CaseHealth[]
  totals: {
    cases: number
    openingsTotal: number
    openingsToday: number
    eshkiSpent: number
    needsAttention: number
  }
}

const ATTENTION: CaseHealthFlag[] = ['too_generous', 'too_expensive', 'low_engagement', 'needs_review']

/** Build the whole-cases operator report from the live-stats map + case names. */
export function buildCasesHealth(
  named: CaseNamed[],
  statsByCase: Map<string, CaseLiveStats>,
): CasesHealthReport {
  const openingsList = named
    .map((c) => statsByCase.get(c.item_code)?.openingsTotal ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  const medianOpenings = openingsList.length
    ? openingsList[Math.floor(openingsList.length / 2)]
    : 0
  const maxOpenings = openingsList.length ? openingsList[openingsList.length - 1] : 0

  const cases = named.map((c) =>
    interpretCase(statsByCase.get(c.item_code), c.name, { medianOpenings, maxOpenings }),
  )

  const attention = cases
    .filter((c) => c.flags.some((f) => ATTENTION.includes(f)))
    .sort((a, b) => ATTENTION.indexOf(a.verdict) - ATTENTION.indexOf(b.verdict))

  const topByOpenings = [...cases].sort((a, b) => b.openingsTotal - a.openingsTotal)

  return {
    cases,
    attention,
    topByOpenings,
    totals: {
      cases: cases.length,
      openingsTotal: cases.reduce((s, c) => s + c.openingsTotal, 0),
      openingsToday: cases.reduce((s, c) => s + c.openingsToday, 0),
      eshkiSpent: cases.reduce((s, c) => s + c.eshkiSpent, 0),
      needsAttention: attention.length,
    },
  }
}
