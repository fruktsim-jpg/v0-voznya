import Link from 'next/link'

/**
 * WorldState — the Command Center hero. Four panels, each answering ONE question
 * about the living platform at a glance: Economy / Players / Season / Gifts.
 * This replaces the old flat 8-counter grid (which answered "here are totals"
 * with no hierarchy). Every panel is a deep link into its domain — the home
 * becomes "this is my project," not a database summary.
 *
 * Pure presentation. Values are pre-loaded server-side and may be null; nulls
 * render as «—» so a missing table never breaks the hero.
 */

const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('ru-RU'))
const fmtCompact = (n: number | null | undefined) =>
  n == null ? '—' : Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`

export type WorldStateData = {
  economy: { totalEshki: number | null; netToday: number | null; activePlayers7d: number | null }
  players: { total: number | null; active7d: number | null }
  season: { name: string | null; daysLeft: number | null; active: boolean }
  gifts: { pending: number | null; completed: number | null }
}

function Panel({
  href,
  emoji,
  label,
  accent,
  children,
}: {
  href: string
  emoji: string
  label: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`glass group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-4 transition hover:border-primary/40 ${accent}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-lg opacity-80">{emoji}</span>
      </div>
      {children}
      <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
        →
      </span>
    </Link>
  )
}

export function WorldState({ data }: { data: WorldStateData }) {
  const net = data.economy.netToday
  const netTone = net == null ? 'text-foreground' : net > 0 ? 'text-amber-300' : net < 0 ? 'text-emerald-300' : 'text-foreground'

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Economy */}
      <Panel href="/admin/economy" emoji="💹" label="Экономика" accent="border-amber-400/25 from-amber-400/[0.08]">
        <div className="text-2xl font-bold text-foreground">{fmt(data.economy.totalEshki)}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">ешек в обороте</div>
        <div className={`mt-2 text-xs font-semibold ${netTone}`}>
          {net == null ? '—' : `${net > 0 ? '+' : ''}${fmtCompact(net)} сегодня`}
        </div>
      </Panel>

      {/* Players */}
      <Panel href="/admin/players" emoji="👥" label="Игроки" accent="border-primary/30 from-primary/[0.08]">
        <div className="text-2xl font-bold text-foreground">{fmt(data.players.total)}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">всего игроков</div>
        <div className="mt-2 text-xs font-semibold text-primary">
          {data.players.active7d == null ? '—' : `${fmt(data.players.active7d)} активны за 7д`}
        </div>
      </Panel>

      {/* Season */}
      <Panel href="/admin/season" emoji="🏆" label="Сезон" accent={data.season.active ? 'border-primary/30 from-primary/[0.08]' : 'border-border from-white/[0.03]'}>
        {data.season.active ? (
          <>
            <div className="truncate text-lg font-bold text-foreground">{data.season.name}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">текущий сезон</div>
            <div className="mt-2 text-xs font-semibold text-primary">
              {data.season.daysLeft == null ? 'идёт' : data.season.daysLeft <= 0 ? 'пора финализировать' : `осталось ${data.season.daysLeft} дн.`}
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-bold text-muted-foreground">Не идёт</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">сезон не запущен</div>
            <div className="mt-2 text-xs font-semibold text-sky-300">запустить →</div>
          </>
        )}
      </Panel>

      {/* Gifts */}
      <Panel href="/admin/gifts/deliveries" emoji="🎁" label="Подарки" accent="border-rose-400/25 from-rose-400/[0.08]">
        <div className="text-2xl font-bold text-foreground">{fmt(data.gifts.pending)}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">в очереди доставки</div>
        <div className="mt-2 text-xs font-semibold text-emerald-300">
          {data.gifts.completed == null ? '—' : `${fmt(data.gifts.completed)} доставлено`}
        </div>
      </Panel>
    </div>
  )
}
