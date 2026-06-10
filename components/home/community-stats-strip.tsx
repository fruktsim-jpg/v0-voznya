import type { CommunityStats } from '@/lib/queries'

/**
 * Community Stats strip (VOZNYA REDESIGN — Home Hub, zone 3).
 *
 * Moved high in the hierarchy (approved adjustment) so the world feels populated
 * before the live feed. Answers part of "What's happening in the community?"
 * with proof-of-scale numbers. Every metric is a real aggregate from
 * `getCommunityStats` — NO fabricated "online now" or invented activity counts.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

export function CommunityStatsStrip({ stats }: { stats: CommunityStats }) {
  const items: { icon: string; value: number; label: string }[] = [
    { icon: '👥', value: stats.users, label: 'игроков' },
    { icon: '🥚', value: stats.eshInCirculation, label: 'ешек в обороте' },
    { icon: '🏆', value: stats.achievements, label: 'достижений' },
    { icon: '⚔️', value: stats.duels, label: 'дуэлей' },
    { icon: '🪙', value: stats.treasuresFound, label: 'кладов' },
    { icon: '💍', value: stats.marriages, label: 'семей' },
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
              <div className="text-lg" aria-hidden>
                {it.icon}
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground sm:text-base">
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
