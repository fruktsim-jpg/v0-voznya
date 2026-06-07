import Link from 'next/link'
import { Card } from '@/components/v2/card'
import { Section } from '@/components/v2/section'
import { getTopRich } from '@/lib/queries'

/**
 * Top Members (V3) — витрина лиц сообщества на РЕАЛЬНЫХ данных (getTopRich).
 * Сообщество = люди. Server component. Топ-3 выделены, остальные компактно.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')
const MEDAL = ['🥇', '🥈', '🥉']

/**
 * Аватар участника: реальное Telegram-фото, если оно есть (photo_url), иначе
 * инициал имени в фирменном кружке. Fallback держит вид целостным, пока не у
 * всех заполнено фото.
 */
function MemberAvatar({
  name,
  photoUrl,
  className = 'h-9 w-9 text-sm',
}: {
  name: string
  photoUrl: string | null
  className?: string
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ring-1 ring-white/10 ${className}`}
      />
    )
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary ring-1 ring-primary/30 ${className}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}


export async function TopMembers({ limit = 8 }: { limit?: number }) {
  const top = await getTopRich(limit)
  if (top.length === 0) return null

  const [first, second, third, ...rest] = top

  return (
    <Section
      title="Лица сообщества"
      subtitle="Самые богатые игроки Возни"
      action={
        <Link
          href="/live#top-rich"
          className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          Все рейтинги
        </Link>

      }
    >
      {/* Подиум топ-3 */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[first, second, third].filter(Boolean).map((u, i) => (
          <Link key={u.userId} href={`/profile/${u.userId}`}>

            <Card
              variant={i === 0 ? 'legendary' : i === 1 ? 'epic' : 'rare'}
              className="flex items-center gap-3 transition hover:-translate-y-0.5"
            >
              <span className="text-2xl" aria-hidden="true">
                {MEDAL[i]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-foreground">{u.name}</div>
                <div className="text-xs text-muted-foreground">{fmt(u.balance)} ешек</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Остальные */}
      {rest.length > 0 && (
        <Card className="divide-y divide-white/5">
          {rest.map((u) => (
            <Link
              key={u.userId}
              href={`/profile/${u.userId}`}
              className="flex items-center gap-3 py-2 transition hover:opacity-80"
            >

              <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                {u.rank}
              </span>
              <MemberAvatar name={u.name} photoUrl={u.photoUrl} className="h-7 w-7 text-[11px]" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{u.name}</span>

              <span className="shrink-0 text-sm font-medium text-muted-foreground">
                {fmt(u.balance)}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </Section>
  )
}
