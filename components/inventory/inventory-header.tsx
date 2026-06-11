'use client'

import { rarityToken } from '@/lib/rarity'
import type { InventorySummary } from '@/lib/inventory-meta'
import { ItemArt } from '@/components/ds/item-art'
import { VoznyaCoin } from '@/components/ds/icon'

/**
 * InventoryHeader (Stage 2) — premium summary band. Compact, high-density,
 * no dashboard bloat: a value-forward hero line + a rarity distribution bar +
 * four KPI cells + a recent-acquisitions strip.
 *
 * Communicates value / progression / status the instant the page opens. All
 * numbers are DERIVED (lib/inventory-meta.summarize) from the read-only
 * inventory — zero new data, zero requests. Client component only because it
 * shares the same client tree as the grid; it has no local state.
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

function Cell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className="mt-0.5 font-mono text-base font-bold tabular-nums"
        style={{ color: accent ?? 'var(--foreground)' }}
      >
        {value}
      </span>
    </div>
  )
}

export function InventoryHeader({
  summary,
  favoritesCount,
  onJumpRecent,
}: {
  summary: InventorySummary
  favoritesCount: number
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

      <div className="relative flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Ценность коллекции
          </p>
          <p className="type-economy flex items-center gap-1.5 text-3xl text-foreground">
            {fmt(summary.totalValue)} <VoznyaCoin tone="gold" className="text-[0.7em]" />
          </p>
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

      <div className="relative mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cell label="Предметов" value={fmt(summary.totalQuantity)} />
        <Cell
          label="Коллекции"
          value={`${summary.collectionsCompleted}/${summary.collectionsTotal}`}
          accent={summary.collectionsCompleted > 0 ? '#f59e0b' : undefined}
        />
        <Cell label="В избранном" value={fmt(favoritesCount)} accent={favoritesCount ? '#ef4444' : undefined} />
        <Cell label="Тиров" value={fmt(summary.rarityDistribution.length)} />
      </div>

      {summary.recent.length > 0 && (
        <div className="relative mt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Недавние
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {summary.recent.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => onJumpRecent?.(i.id)}
                className="shrink-0 transition active:scale-95"
                title={i.name}
              >
                <ItemArt src={i.art} glyph={i.glyph} rarity={i.rarity} size="sm" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
