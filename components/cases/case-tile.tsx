'use client'

import { rewardGlyph, type CaseView } from '@/lib/cases-ux'
import { ItemArt } from '@/components/ds/item-art'
import { Glyph } from '@/components/ds/icon/glyph'
import { IndicatorChips } from '@/components/cases/indicator-chips'
import { caseCostShort } from '@/components/cases/case-meta'
import { rarityToken } from '@/lib/rarity'

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
  const top = c.topReward
  const rt = rarityToken(c.topRarity)

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(c)}
      aria-label={`Открыть кейс ${c.name}`}
      className="glass group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-border p-3 text-left transition hover:-translate-y-0.5 hover:border-white/15 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Faint rarity-tinted gradient wash from the top reward's tier. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `linear-gradient(160deg, ${rt.color}1f 0%, transparent 55%)` }}
      />
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
          <h3 className="line-clamp-1 text-sm font-extrabold tracking-tight text-foreground">{c.name}</h3>
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

      {/* Cost CTA — tinted in the case's top-rarity color. */}
      <span
        className="relative mt-0.5 flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition"
        style={{
          color: rt.color,
          borderColor: `${rt.color}66`,
          backgroundColor: `${rt.color}1a`,
        }}
      >
        Открыть · {caseCostShort(c)}
      </span>
    </button>
  )
}
