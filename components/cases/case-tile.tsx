'use client'

import { rarityToken } from '@/lib/rarity'
import type { CaseView } from '@/lib/cases-ux'
import { ItemArt } from '@/components/ds/item-art'
import { RarityDistribution } from '@/components/cases/rarity-distribution'
import {
  caseCostShort,
  caseIndicators,
  INDICATOR_CLASS,
} from '@/components/cases/case-meta'

/**
 * CaseTile (Stage 3) — the dense hub card. Reads, in one glance: artwork +
 * top-tier accent, name, cost, what you're chasing (value prop), the rarity
 * PROFILE (distribution bar) and limited/premium indicators. Tapping opens the
 * case detail experience (the brief's "understand why a case matters" screen) —
 * opening itself happens there, so the calm grid never reflows.
 *
 * Client component (tap handler + active scale). Presentation only — no data
 * access, no opening logic here.
 */
export function CaseTile({
  caseView,
  onOpenDetail,
}: {
  caseView: CaseView
  onOpenDetail: (c: CaseView) => void
}) {
  const c = caseView
  const t = rarityToken(c.topRarity)
  const accent = c.topRarity !== 'common'
  const indicators = caseIndicators(c).slice(0, 2)

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
        <ItemArt glyph="📦" rarity={c.topRarity} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-bold text-foreground">{c.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
            {c.valueProp ?? `${c.rewardCount} наград · до ${t.label.toLowerCase()}`}
          </p>
          {/* Indicators */}
          {indicators.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {indicators.map((ind) => (
                <span
                  key={ind.key}
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${INDICATOR_CLASS[ind.tone]}`}
                >
                  <span aria-hidden="true">{ind.glyph}</span>
                  {ind.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rarity profile bar */}
      <RarityDistribution slices={c.rarityDistribution} height={6} className="relative" />

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
