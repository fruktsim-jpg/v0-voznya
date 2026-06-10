'use client'

import { rarityToken } from '@/lib/rarity'
import type { CaseView } from '@/lib/cases-ux'
import { ItemArt } from '@/components/ds/item-art'
import { RarityDistribution } from '@/components/cases/rarity-distribution'
import {
  caseCostLabel,
  caseIndicators,
  INDICATOR_CLASS,
} from '@/components/cases/case-meta'

/**
 * FeaturedCard (Stage 3) — the hero of the cases hub. The single most valuable
 * case gets a full-width, gradient-washed presentation that anchors attention
 * and sets the premium tone before the dense grid. Big artwork, the chase
 * reward, the rarity profile and a prominent open CTA.
 *
 * Client component (tap → open detail). Presentation only.
 */
export function FeaturedCard({
  caseView,
  onOpenDetail,
}: {
  caseView: CaseView
  onOpenDetail: (c: CaseView) => void
}) {
  const c = caseView
  const t = rarityToken(c.topRarity)
  const indicators = caseIndicators(c)

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(c)}
      aria-label={`Открыть кейс ${c.name}`}
      className="relative flex w-full flex-col overflow-hidden rounded-3xl border p-4 text-left transition active:scale-[0.99] sm:p-5"
      style={{ borderColor: `${t.color}80`, boxShadow: t.glow || undefined }}
    >
      {/* Tier gradient backdrop */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: t.gradient }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 0%, transparent, rgba(0,0,0,0.5))' }}
      />
      {/* Slow conic sheen — single rotating element, GPU-cheap */}
      <span
        aria-hidden="true"
        className="case-sheen-spin pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-2xl"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${t.color}, transparent 60%)`,
        }}
      />

      <div className="relative flex items-center gap-2">
        <span className="rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
          ★ Рекомендуем
        </span>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          {indicators.map((ind) => (
            <span
              key={ind.key}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${INDICATOR_CLASS[ind.tone]}`}
            >
              <span aria-hidden="true">{ind.glyph}</span>
              {ind.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-4">
        <ItemArt glyph="📦" rarity={c.topRarity} size="xl" className="!h-28 !w-28 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">{c.name}</h2>
          {c.topReward && (
            <p className="mt-1 line-clamp-2 text-sm text-white/80">
              <span aria-hidden="true">💎 </span>
              {c.topReward.label}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/70">
            <span>{c.rewardCount} наград</span>
            {c.rareChance > 0 && (
              <span className="font-mono tabular-nums">
                редкое+ {c.rareChance >= 10 ? c.rareChance.toFixed(0) : c.rareChance.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-3">
        <RarityDistribution slices={c.rarityDistribution} height={8} />
      </div>

      <span
        className="case-cta-pulse relative mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-white/25 bg-white/15 py-2.5 text-sm font-bold text-white backdrop-blur-sm"
      >
        Открыть · {caseCostLabel(c)}
      </span>
    </button>
  )
}
