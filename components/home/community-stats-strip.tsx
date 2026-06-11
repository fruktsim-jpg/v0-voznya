import type { ReactNode } from 'react'
import type { CommunityStats } from '@/lib/queries'
import { Glyph, VoznyaCoin } from '@/components/ds/icon'

/**
 * Community Stats strip (VOZNYA REDESIGN — Home Hub, zone 3).
 *
 * Moved high in the hierarchy (approved adjustment) so the world feels populated
 * before the live feed. Answers part of "What's happening in the community?"
 * with proof-of-scale numbers. Every metric is a real aggregate from
 * `getCommunityStats` — NO fabricated "online now" or invented activity counts.
 *
 * B3: emoji icons → owned glyph/coin set (the ешка stat shows the minted coin).
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

export function CommunityStatsStrip({ stats }: { stats: CommunityStats }) {
  const items: { icon: ReactNode; value: number; label: string; tint: string }[] = [
    { icon: <Glyph name="profile" />, value: stats.users, label: 'игроков', tint: 'var(--accent-indigo)' },
    { icon: <VoznyaCoin tone="gold" />, value: stats.eshInCirculation, label: 'ешек в обороте', tint: 'var(--accent-gold)' },
    { icon: <Glyph name="trophy" />, value: stats.achievements, label: 'достижений', tint: 'var(--accent-gold)' },
    { icon: <Glyph name="shield" />, value: stats.duels, label: 'дуэлей', tint: 'var(--accent-red)' },
    { icon: <Glyph name="vault" />, value: stats.treasuresFound, label: 'кладов', tint: 'var(--accent-teal)' },
    { icon: <Glyph name="spark" />, value: stats.marriages, label: 'семей', tint: 'var(--accent-pink)' },
  ]

  return (
    <section className="px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {items.map((it) => (
            <div
              key={it.label}
              className="glass rounded-2xl border border-border px-3 py-3 text-center"
            >
              <div className="flex justify-center text-lg" style={{ color: it.tint }} aria-hidden>
                {it.icon}
              </div>
              <div className="mt-0.5 type-stat text-sm text-foreground sm:text-base">
                {fmt(it.value)}
              </div>
              <div className="text-[10px] leading-tight text-muted-foreground sm:text-xs">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
