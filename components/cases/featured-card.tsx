'use client'

import { rarityToken } from '@/lib/rarity'
import { rewardGlyph, rewardItemClass, chanceLabel, type CaseView } from '@/lib/cases-ux'
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
      className="glass relative flex w-full flex-col overflow-hidden rounded-3xl border border-border p-4 text-left transition active:scale-[0.99] sm:p-5"
      style={{ borderColor: `${t.color}40` }}
    >
      {/* Thin rarity rule — signature, not a full-card wash. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(to right, ${t.color}80, transparent 70%)` }}
      />

      <div className="relative flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: `${t.color}1a`, color: t.color }}
        >
          <Glyph name="spark" className="h-3 w-3" /> Рекомендуем
        </span>
        <div className="ml-auto">
          <IndicatorChips caseView={c} size="md" />
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-4">
        {/* THE DREAM — the actual top reward, big, in its rarity capsule. */}
        <ItemArt
          code={top?.rewardItemCode ?? null}
          itemClass={top ? rewardItemClass(top) : 'case'}
          glyph={<Glyph name={top ? rewardGlyph(top) : 'case'} />}
          rarity={c.topRarity}
          size="xl"
          className="!h-28 !w-28 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {c.name}
          </p>
          {top && (
            <>
              <h2 className="mt-0.5 line-clamp-2 text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
                {top.label}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                твой шанс выиграть · {chanceLabel(top.chance)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Runner-up chase rewards — "и ещё можно поймать" as small rarity art. */}
      {runnerUps.length > 0 && (
        <div className="relative mt-3 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">а ещё</span>
          {runnerUps.map((r, i) => (
            <ItemArt
              key={`${r.rewardItemCode ?? r.rewardKind}-${i}`}
              code={r.rewardItemCode ?? null}
              itemClass={rewardItemClass(r)}
              glyph={<Glyph name={rewardGlyph(r)} />}
              rarity={r.rarity}
              size="sm"
              className="!h-10 !w-10"
            />
          ))}
        </div>
      )}

      <span
        className="relative mt-3 flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-sm font-bold transition"
        style={{ borderColor: `${t.color}55`, background: `${t.color}1a`, color: t.color }}
      >
        Открыть · {caseCostLabel(c)}
      </span>

      {opens != null && opens > 0 && (
        <p className="relative mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <Glyph name="users" className="h-3 w-3" />
          уже открыли {opens.toLocaleString('ru-RU')} раз
        </p>
      )}
    </button>
  )
}
