'use client'

import { rarityToken } from '@/lib/rarity'
import { rewardGlyph, rewardItemClass, type CaseView } from '@/lib/cases-ux'
import { ItemArt } from '@/components/ds/item-art'
import { Glyph } from '@/components/ds/icon/glyph'
import { IndicatorChips } from '@/components/cases/indicator-chips'
import { caseCostShort } from '@/components/cases/case-meta'

/**
 * CaseTile — a DESIRE card, not a spec sheet. It leads with the DREAM: the
 * case's single most valuable reward rendered as a rarity-colored art capsule
 * (not a generic box), so you immediately see what you could win. Scarcity
 * ("осталось N") and popularity ("открыли N раз") are real, from the data layer.
 * Tapping opens the detail/opening experience (the reel never lives in the grid).
 *
 * Client component (tap + active scale). Presentation only — no data access.
 */
export function CaseTile({
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
  const accent = c.topRarity !== 'common'
  const top = c.topReward

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(c)}
      aria-label={`Открыть кейс ${c.name}`}
      className="group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border bg-white/[0.02] p-3 text-left transition active:scale-[0.98]"
      style={{
        borderColor: accent ? `${t.color}66` : 'rgba(255,255,255,0.08)',
        boxShadow: accent ? t.glow || undefined : undefined,
      }}
    >
      {/* Tier glow wash behind the art */}
      {accent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-20 blur-3xl transition group-hover:opacity-35"
          style={{ background: t.color }}
        />
      )}

      <div className="relative flex items-start gap-3">
        {/* The DREAM: the actual top reward as rarity art, not a generic box. */}
        <ItemArt
          code={top?.rewardItemCode ?? null}
          itemClass={top ? rewardItemClass(top) : 'case'}
          glyph={<Glyph name={top ? rewardGlyph(top) : 'case'} />}
          rarity={c.topRarity}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-bold text-foreground">{c.name}</h3>
          {/* «Ты можешь выиграть …» — ведём мечтой, а не числом наград. */}
          {top ? (
            <p className="mt-0.5 line-clamp-1 text-[11px]">
              <span className="text-muted-foreground">можно выиграть </span>
              <span className="font-semibold" style={{ color: accent ? t.color : undefined }}>
                {top.label}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {c.rewardCount} наград
            </p>
          )}
          <div className="mt-1.5">
            <IndicatorChips caseView={c} max={2} />
          </div>
        </div>
      </div>

      {/* Popularity — real social proof from the openings ledger. */}
      {opens != null && opens > 0 && (
        <p className="relative flex items-center gap-1 text-[10px] text-muted-foreground">
          <Glyph name="users" className="h-3 w-3" />
          открыли {opens.toLocaleString('ru-RU')} раз
        </p>
      )}

      {/* Cost CTA */}
      <span
        className="relative mt-0.5 flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition"
        style={{
          borderColor: accent ? `${t.color}55` : 'rgba(255,255,255,0.12)',
          color: accent ? t.color : 'var(--foreground)',
          background: accent ? `${t.color}12` : 'rgba(255,255,255,0.03)',
        }}
      >
        Открыть · {caseCostShort(c)}
      </span>
    </button>
  )
}
