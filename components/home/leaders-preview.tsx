import Link from 'next/link'
import { SectionTitle } from '@/components/ds/section-title'
import { VoznyaCoin } from '@/components/ds/icon'
import { Avatar } from '@/components/ds/avatar'
import type { RichUser } from '@/lib/queries'

/**
 * Leaders preview (VOZNYA REDESIGN — Home Hub, zone 9).
 *
 * Social-status / community teaser on real data (`getTopRich`). Compact top-5
 * with the podium emphasized; full rankings live on the leaderboard surface.
 * Links currently point at the existing `/live#top-rich` destination to stay
 * route-honest. Uses the DS Avatar (real TG photo + fallback) and the shared
 * PODIUM tinted-ordinal pattern instead of emoji medals.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')
const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

export function LeadersPreview({ leaders }: { leaders: RichUser[] }) {
  if (leaders.length === 0) return null

  return (
    <section className="px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-end justify-between gap-3">
          <SectionTitle eyebrow="Богатейшие" size="md">
            Элита сообщества
          </SectionTitle>
          <Link
            href="/live#tops"
            className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            Все рейтинги
          </Link>
        </div>

        <div className="glass divide-y divide-white/5 rounded-2xl border border-border">
          {leaders.map((u, i) => (
            <Link
              key={u.userId}
              href={`/profile/${u.userId}`}
              className="flex items-center gap-3 px-4 py-2.5 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/[0.03]"
            >
              <span className="w-6 shrink-0 text-center text-sm">
                {i < 3 ? (
                  <span className="font-extrabold" style={{ color: PODIUM[i] }}>{u.rank}</span>
                ) : (
                  <span className="font-bold text-muted-foreground">{u.rank}</span>
                )}
              </span>
              <Avatar src={u.photoUrl} name={u.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {u.name}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                <span className="type-economy">{fmt(u.balance)}</span> <VoznyaCoin tone="muted" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
