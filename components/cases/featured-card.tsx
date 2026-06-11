'use client'

import { rarityToken } from '@/lib/rarity'
import { rewardGlyph, chanceLabel, type CaseView } from '@/lib/cases-ux'
import { ItemArt } from '@/components/ds/item-art'
import { Glyph } from '@/components/ds/icon/glyph'
import { IndicatorChips } from '@/components/cases/indicator-chips'
import { caseCostLabel } from '@/components/cases/case-meta'

/**
 * FeaturedCard — the hero of the storefront. Its only job is DESIRE: the most
 * exciting case gets a full-width, gradient-washed stage that shows THE DREAM —
 * the actual top reward as big rarity art, the few runner-up chase rewards, real
 * scarcity ("осталось N"), and a prominent open CTA. This is "я хочу это" before
 * the reel ever spins.
 *
 * Client component (tap → open detail). Presentation only.
 */
export function FeaturedCard({
  caseView,
  opens,
  onOpenDetail,
}: {
  caseView: CaseView
  opens?: number
  onOpenDetail: (c: CaseView) => void
}) {
  const c = caseView
  const t = rarityToken(c.topRarity)
  const top = c.topReward
  // Up to 3 runner-up chase rewards (after the headline one) for "и ещё …".
  const runnerUps = c.best.slice(1, 4)

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
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
          <Glyph name="spark" className="h-3 w-3" /> Рекомендуем
        </span>
        <div className="ml-auto">
          <IndicatorChips caseView={c} size="md" />
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-4">
        {/* THE DREAM — the actual top reward, big, in its rarity capsule. */}
        <ItemArt
          glyph={<Glyph name={top ? rewardGlyph(top) : 'case'} />}
          rarity={c.topRarity}
          size="xl"
          className="!h-28 !w-28 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
            {c.name}
          </p>
          {top && (
            <>
              <h2 className="mt-0.5 line-clamp-2 text-xl font-extrabold leading-tight text-white sm:text-2xl">
                {top.label}
              </h2>
              <p className="mt-1 text-xs text-white/70">
                твой шанс выиграть · {chanceLabel(top.chance)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Runner-up chase rewards — "и ещё можно поймать" as small rarity art. */}
      {runnerUps.length > 0 && (
        <div className="relative mt-3 flex items-center gap-2">
          <span className="text-[10px] text-white/50">а ещё</span>
          {runnerUps.map((r, i) => (
            <ItemArt
              key={`${r.rewardItemCode ?? r.rewardKind}-${i}`}
              glyph={<Glyph name={rewardGlyph(r)} />}
              rarity={r.rarity}
              size="sm"
              className="!h-10 !w-10"
            />
          ))}
        </div>
      )}

      <span className="case-cta-pulse relative mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-white/25 bg-white/15 py-2.5 text-sm font-bold text-white backdrop-blur-sm">
        Открыть · {caseCostLabel(c)}
      </span>

      {opens != null && opens > 0 && (
        <p className="relative mt-2 flex items-center justify-center gap-1 text-[10px] text-white/60">
          <Glyph name="users" className="h-3 w-3" />
          уже открыли {opens.toLocaleString('ru-RU')} раз
        </p>
      )}
    </button>
  )
}
