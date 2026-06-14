'use client'

import { rewardGlyph, type CaseView } from '@/lib/cases-ux'
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
  const top = c.topReward

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(c)}
      aria-label={`Открыть кейс ${c.name}`}
      className="group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-border bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.04] active:scale-[0.98]"
    >
      <div className="relative flex items-start gap-3">
        {/* The CASE COVER (box art) — the storefront is a wall of real boxes.
            The dream reward is named in the text beside it ("можно выиграть X").
            Case cover art resolves by the case's own code; falls back to a box
            glyph until a cover asset exists. */}
        <ItemArt
          code={c.itemCode}
          itemClass="case"
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
              <span className="font-semibold text-foreground">{top.label}</span>
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

      {/* Cost CTA — one accent (primary), neutral language. */}
      <span className="relative mt-0.5 flex items-center justify-center gap-1 rounded-xl border border-primary/40 bg-primary/10 py-2 text-xs font-bold text-primary transition group-hover:bg-primary/15">
        Открыть · {caseCostShort(c)}
      </span>
    </button>
  )
}
