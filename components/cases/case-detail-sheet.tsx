'use client'

import { Drawer } from 'vaul'
import { rarityToken } from '@/lib/rarity'
import { chanceLabel, qtyLabel, type CaseView, type RewardView } from '@/lib/cases-ux'
import { Sheet } from '@/components/ds/sheet'
import { ItemArt } from '@/components/ds/item-art'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { RarityDistribution } from '@/components/cases/rarity-distribution'
import { CaseOpeningFlow } from '@/components/cases/case-opening-flow'
import {
  caseCostLabel,
  caseIndicators,
  INDICATOR_CLASS,
} from '@/components/cases/case-meta'

/**
 * CaseDetailSheet (Stage 3) — the "understand why this case matters, then open
 * it" surface. A bottom sheet (mobile-native) with: hero artwork on the tier
 * gradient, value proposition, the FULL rarity distribution (legend), status
 * indicators, the complete drop-list (every reward, its rarity + odds), and the
 * opening flow embedded so the calm hub grid never reflows during a spin.
 *
 * Odds shown here are the SAME weights the bot's open_case honors (derived in
 * lib/cases / lib/cases-ux), so the displayed value matches what can drop.
 */

function RewardRow({ r }: { r: RewardView }) {
  const t = rarityToken(r.rarity)
  const qty = qtyLabel(r)
  const icon = r.isJackpot
    ? '💎'
    : r.rewardKind === 'currency'
      ? '💰'
      : r.rewardKind === 'tg_gift'
        ? '🎁'
        : '🎖️'
  return (
    <li
      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
      style={{ borderColor: r.rarity === 'common' ? 'rgba(255,255,255,0.08)' : `${t.color}55` }}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-foreground">
        {r.label}
        {qty && <span className="ml-1 text-muted-foreground">{qty}</span>}
        {r.limited && <span className="ml-2 text-[11px] text-amber-300">лимит</span>}
      </span>
      <RarityBadge rarity={r.rarity} />
      <span className="shrink-0 font-mono text-xs tabular-nums" style={{ color: t.color }}>
        {chanceLabel(r.chance)}
      </span>
    </li>
  )
}

export function CaseDetailSheet({
  caseView,
  open,
  onOpenChange,
}: {
  caseView: CaseView | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!caseView) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <Drawer.Title className="sr-only">Кейс</Drawer.Title>
        <span />
      </Sheet>
    )
  }

  const c = caseView
  const t = rarityToken(c.topRarity)
  const indicators = caseIndicators(c)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Drawer.Title className="sr-only">{c.name}</Drawer.Title>
      <Drawer.Description className="sr-only">
        {c.rewardCount} наград · открытие {caseCostLabel(c)}
      </Drawer.Description>

      {/* Hero on the tier gradient */}
      <div
        className="relative -mx-4 -mt-4 mb-4 flex flex-col items-center overflow-hidden px-4 pb-5 pt-6 sm:-mx-6 sm:px-6"
        style={{ background: t.gradient }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(circle at 50% 20%, transparent, rgba(0,0,0,0.45))' }}
        />
        <div className="relative">
          <ItemArt glyph="📦" rarity={c.topRarity} size="xl" />
        </div>
        <h2 className="relative mt-3 text-center text-xl font-bold text-foreground">{c.name}</h2>
        {indicators.length > 0 && (
          <div className="relative mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {indicators.map((ind) => (
              <span
                key={ind.key}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm ${INDICATOR_CLASS[ind.tone]}`}
              >
                <span aria-hidden="true">{ind.glyph}</span>
                {ind.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {c.description && <p className="mb-4 text-sm text-muted-foreground">{c.description}</p>}

      {/* Value profile */}
      <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Профиль редкости
          </h3>
          {c.rareChance > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              редкое+ {chanceLabel(c.rareChance)}
            </span>
          )}
        </div>
        <RarityDistribution slices={c.rarityDistribution} showLegend height={10} />
      </div>

      {/* Opening flow (frozen API inside) */}
      <div className="mb-4">
        <CaseOpeningFlow caseView={c} />
      </div>

      {/* Full drop-list */}
      {c.best.length > 0 && (
        <div className="mb-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Содержимое · {c.rewardCount} наград
          </h3>
          <ul className="space-y-1.5">
            {c.best.map((r, idx) => (
              <RewardRow key={`${r.rewardItemCode ?? r.rewardKind}-${idx}`} r={r} />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Шансы — из весов дроп-листа, каждое открытие в проверяемом логе.
        Лимитированные награды ограничены по количеству.
      </p>
    </Sheet>
  )
}
