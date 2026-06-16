'use client'

import { rarityToken } from '@/lib/rarity'
import type { InventorySummary } from '@/lib/inventory-meta'
import { VoznyaCoin } from '@/components/ds/icon'

/**
 * InventoryHeader (E0.x vault pass) — a COMPACT collection strip, not a portfolio
 * dashboard.
 *
 * The audit found the old header opened the screen like a stock portfolio: a
 * `text-3xl` "Ценность коллекции" hero + a 4-cell KPI grid (Предметов / Коллекции
 * / В избранном / Тиров) + a "Недавние" strip — pushing the player's actual items
 * below the fold and failing the 5-second "this is my collection" test. Every one
 * of those KPIs is re-derived elsewhere (item count = the grid + filter count;
 * Коллекции = the collections rail; В избранном = a filter chip; Тиров = the
 * rarity bar itself), so the grid added a stat band for zero new information.
 *
 * Now: ONE slim line — value as an inline figure (not a hero) + top-tier pill —
 * over the rarity-distribution bar (the one genuinely collection-shaped visual).
 * This lifts the items into the first viewport so the screen reads as a vault.
 *
 * All numbers stay DERIVED (lib/inventory-meta.summarize) from the read-only
 * inventory — zero new data, zero requests.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

function RarityBar({ summary }: { summary: InventorySummary }) {
  const total = summary.totalQuantity || 1
  if (summary.rarityDistribution.length === 0) return null
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {summary.rarityDistribution.map((s) => (
          <span
            key={s.rarity}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.count / total) * 100}%`, background: s.color }}
            title={`${rarityToken(s.rarity).label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {summary.rarityDistribution.map((s) => (
          <span key={s.rarity} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="tabular-nums">{s.count}</span>
            <span className="hidden sm:inline">{rarityToken(s.rarity).label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function InventoryHeader({
  summary,
}: {
  summary: InventorySummary
  /** Kept for call-site compatibility; no longer rendered as a KPI/strip. */
  favoritesCount?: number
  onJumpRecent?: (id: string) => void
}) {
  const top = rarityToken(summary.topRarity)

  return (
    <section
      className="glass relative overflow-hidden rounded-2xl border border-border p-4"
      style={{ borderColor: summary.topRarity !== 'common' ? `${top.color}55` : undefined }}
    >
      {/* tier glow */}
      {summary.topRarity !== 'common' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full opacity-25 blur-3xl"
          style={{ background: top.color }}
        />
      )}

      {/* One slim line: items count (the vault's size) · value as a quiet figure
          · top-tier pill. Value is NOT a hero anymore — the items are. */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="type-stat text-lg text-foreground">
            {fmt(summary.totalQuantity)}
          </span>
          <span className="label-eyebrow">
            {summary.totalQuantity === 1 ? 'предмет' : 'предметов'}
          </span>
          {summary.totalValue > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <span className="type-economy tabular-nums">{fmt(summary.totalValue)}</span>
                <VoznyaCoin tone="muted" className="text-[0.85em]" />
              </span>
            </>
          )}
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={{ borderColor: `${top.color}66`, color: top.color, boxShadow: top.glow || undefined }}
        >
          топ · {top.label}
        </span>
      </div>

      <div className="relative mt-3">
        <RarityBar summary={summary} />
      </div>
    </section>
  )
}
