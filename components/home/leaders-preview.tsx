import Link from 'next/link'
import { SectionTitle } from '@/components/ds/section-title'
import type { RichUser } from '@/lib/queries'

/**
 * Leaders preview (VOZNYA REDESIGN — Home Hub, zone 9).
 *
 * Social-status / community teaser on real data (`getTopRich`). Compact top-5
 * with the podium emphasized; full rankings live on the leaderboard surface.
 * Links currently point at the existing `/live#top-rich` destination (the
 * dedicated `/leaderboards` page is a later stage) to stay route-honest.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')
const MEDAL = ['🥇', '🥈', '🥉']

function MemberAvatar({
  name,
  photoUrl,
}: {
  name: string
  photoUrl: string | null
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    )
  }
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary ring-1 ring-primary/30"
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

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
            href="/live#top-rich"
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
                  <span aria-hidden>{MEDAL[i]}</span>
                ) : (
                  <span className="font-bold text-muted-foreground">{u.rank}</span>
                )}
              </span>
              <MemberAvatar name={u.name} photoUrl={u.photoUrl} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {u.name}
              </span>
              <span className="shrink-0 font-mono text-sm text-muted-foreground">
                {fmt(u.balance)} 🥚
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
