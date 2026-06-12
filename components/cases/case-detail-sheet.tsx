'use client'

import { Drawer } from 'vaul'
import { rarityToken } from '@/lib/rarity'
import { chanceLabel, qtyLabel, rewardGlyph, rewardItemClass, type CaseView, type RewardView } from '@/lib/cases-ux'
import { Sheet } from '@/components/ds/sheet'
import { ItemArt } from '@/components/ds/item-art'
import { Glyph } from '@/components/ds/icon/glyph'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { RarityDistribution } from '@/components/cases/rarity-distribution'
import { CaseOpeningFlow } from '@/components/cases/case-opening-flow'
import { IndicatorChips } from '@/components/cases/indicator-chips'
import { caseCostLabel } from '@/components/cases/case-meta'

/**
 * CaseDetailSheet — "see the dream, then open it". A bottom sheet (mobile-native)
 * that leads with the case's top reward, then real scarcity ("осталось N") and
 * the honest odds, then the embedded opening flow (the reel — UNCHANGED), then
 * the full drop-list. Every reward shows its rarity art (owned glyph on a rarity
 * capsule), not a generic emoji.
 *
 * Odds shown here are the SAME weights the bot's open_case honors (derived in
 * lib/cases / lib/cases-ux), so the displayed value matches what can drop.
 */

function RewardRow({ r }: { r: RewardView }) {
  const t = rarityToken(r.rarity)
  const qty = qtyLabel(r)
  return (
    <li
      className="flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm"
      style={{ borderColor: r.rarity === 'common' ? 'rgba(255,255,255,0.08)' : `${t.color}55` }}
    >
      <ItemArt code={r.rewardItemCode ?? null} itemClass={rewardItemClass(r)} glyph={<Glyph name={rewardGlyph(r)} />} rarity={r.rarity} size="sm" className="!h-9 !w-9" />
      <span className="min-w-0 flex-1 truncate text-foreground">
        {r.label}
        {qty && <span className="ml-1 text-muted-foreground">{qty}</span>}
        {/* Real Stars value of a Telegram Gift reward, when known. */}
        {r.rewardKind === 'tg_gift' && r.starCost != null && (
          <span className="ml-2 text-[11px] text-amber-300">★ {r.starCost.toLocaleString('ru-RU')}</span>
        )}
        {/* Real remaining supply for a limited reward (not just a flag). */}
        {r.remaining != null && (
          <span className="ml-2 text-[11px] font-semibold text-rose-300">
            осталось {r.remaining.toLocaleString('ru-RU')}
          </span>
        )}
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
  const top = c.topReward

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Drawer.Title className="sr-only">{c.name}</Drawer.Title>
      <Drawer.Description className="sr-only">
        {c.rewardCount} наград · открытие {caseCostLabel(c)}
      </Drawer.Description>

      {/* Hero on the tier gradient — leads with the DREAM (the top reward). */}
      <div
        className="relative -mx-4 -mt-4 mb-4 flex flex-col items-center overflow-hidden px-4 pb-5 pt-6 sm:-mx-6 sm:px-6"
        style={{ background: t.gradient }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(circle at 50% 20%, transparent, rgba(0,0,0,0.45))' }}
        />
        <p className="relative text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
          {c.name}
        </p>
        <div className="relative mt-2">
          <ItemArt code={top?.rewardItemCode ?? null} itemClass={top ? rewardItemClass(top) : 'case'} glyph={<Glyph name={top ? rewardGlyph(top) : 'case'} />} rarity={c.topRarity} size="xl" />
        </div>
        {top && (
          <>
            <h2 className="relative mt-3 text-center text-xl font-bold text-foreground">{top.label}</h2>
            <p className="relative mt-0.5 text-center text-xs text-muted-foreground">
              твой шанс · {chanceLabel(top.chance)}
            </p>
          </>
        )}
        <div className="relative mt-2 flex flex-wrap items-center justify-center">
          <IndicatorChips caseView={c} size="md" />
        </div>
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
