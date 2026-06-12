import Link from 'next/link'
import { getAdminSession } from '@/lib/auth/admin-session'
import { loadDashboardCounters, loadRecentAudit } from '@/lib/admin-stats'
import { loadPulse } from '@/lib/command-center-pulse'
import { CommandCenterPulse } from '@/components/admin/command-center-pulse'
import { PlayerSearch } from '@/components/admin/player-search'
import { humanizeAudit, roleLabel } from '@/lib/admin-format'

export const dynamic = 'force-dynamic'

const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('ru-RU'))

type StatCard = {
  emoji: string
  label: string
  value: number | null
  tone: string // border + glow tint
}

/**
 * Admin dashboard. Search-first, with a grid of glass stat cards and a
 * humanized recent-activity feed. Counters degrade gracefully (show —) when a
 * foundation table is missing on the target DB, so the page never 500s.
 */
export default async function AdminDashboardPage() {
  const session = await getAdminSession()
  if (!session) return null

  const [counters, recent, pulse] = await Promise.all([
    loadDashboardCounters(),
    loadRecentAudit(15),
    loadPulse(),
  ])

  const cards: StatCard[] = [
    { emoji: '👥', label: 'Игроков', value: counters.players, tone: 'border-primary/30 from-primary/[0.08]' },
    { emoji: '💰', label: 'Всего ешек', value: counters.ezhki, tone: 'border-amber-400/25 from-amber-400/[0.08]' },
    { emoji: '🏆', label: 'Всего MMR', value: counters.mmr, tone: 'border-primary/30 from-primary/[0.08]' },
    { emoji: '❤️', label: 'Всего репутации', value: counters.reputation, tone: 'border-rose-400/25 from-rose-400/[0.08]' },
    { emoji: '🎒', label: 'Предметов в каталоге', value: counters.catalogItems, tone: 'border-sky-400/25 from-sky-400/[0.08]' },
    { emoji: '🏅', label: 'Выдано достижений', value: counters.achievementsGranted, tone: 'border-emerald-400/25 from-emerald-400/[0.08]' },
    { emoji: '📦', label: 'Предметов в инвентарях', value: counters.itemsInInventories, tone: 'border-sky-400/25 from-sky-400/[0.08]' },
    { emoji: '📜', label: 'Записей аудита', value: counters.auditRecords, tone: 'border-border from-white/[0.04]' },
  ]

  return (
    <div className="space-y-8">
      {/* Pulse — the hero: what needs attention right now (cross-system) */}
      <section>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Командный центр</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Состояние всей экосистемы VOZNYA одним взглядом. Ниже — поиск игрока и сводка.
        </p>
        <CommandCenterPulse report={pulse} />
      </section>

      {/* Search — now a tool, not the hero */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Поиск игрока
        </h2>
        <PlayerSearch />
      </section>

      {/* Counters */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Сводка
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`glass rounded-2xl border bg-gradient-to-br to-transparent p-4 ${c.tone}`}
            >
              <div className="text-xl sm:text-2xl">{c.emoji}</div>
              <div className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{fmt(c.value)}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{c.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Последние действия
          </h2>
          <Link href="/admin/audit" className="text-xs font-medium text-primary hover:underline">
            Весь аудит →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="glass rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Пока нет записей.
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => {
              const h = humanizeAudit(r)
              return (
                <li
                  key={r.id}
                  className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                    {h.emoji}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-foreground">
                      {r.target_name ?? (r.target_user_id ? `id ${r.target_user_id}` : 'Система')}
                    </span>{' '}
                    <span className={h.tone}>{h.text}</span>
                    {r.reason && (
                      <span className="text-muted-foreground"> · {r.reason}</span>
                    )}
                    <div className="text-[11px] text-muted-foreground">
                      {roleLabel(r.actor_role)} {r.actor_name ?? `id ${r.actor_user_id}`} ·{' '}
                      {new Date(r.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
