import Link from 'next/link'
import { Avatar } from '@/components/ds/avatar'
import { DivisionBadge } from '@/components/prestige'
import { VoznyaCoin } from '@/components/ds/icon'
import type { PlayerStrip as PlayerStripData } from '@/lib/home-context'

/**
 * PlayerStrip (VOZNYA REDESIGN — Home, the only personal element).
 *
 * INTENTIONALLY THIN. Home is world-first; identity belongs to Profile and the
 * persistent shell bar. This is a single slim anchor row — current state only
 * (division · season standing · balance · leaderboard place) — never a hero,
 * never progression detail, goals, achievements or cosmetics. It exists so a
 * returning player has a quick "where do I stand in this world" handle, then
 * immediately drops into world content below.
 *
 * Every value is current-state and DB-backed. Tapping anything routes to the
 * owning surface (Profile / season / leaderboard / inventory).
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

export function PlayerStrip({ player }: { player: PlayerStripData }) {
  const name = player.name?.trim() || 'Игрок'

  return (
    <div className="px-4 pt-3 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="glass flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5">
          <Link
            href={`/profile/${player.userId}`}
            className="flex min-w-0 items-center gap-2.5 transition hover:opacity-90"
            aria-label="Открыть профиль"
          >
            <Avatar src={player.photoUrl} name={name} size="sm" />
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">
              {name}
            </span>
          </Link>

          {/* Current standing — compact chips, no progress bars. */}
          <div className="ml-auto flex items-center gap-1.5">
            {player.division && (
              <Link
                href="/season"
                className="hidden transition hover:-translate-y-0.5 sm:inline-flex"
                aria-label={`Дивизион: ${player.division.name}`}
              >
                <DivisionBadge
                  emoji={player.division.emoji}
                  name={player.division.name}
                  size="sm"
                  sub={
                    player.seasonRank !== null ? (
                      <span className="font-mono">#{player.seasonRank}</span>
                    ) : undefined
                  }
                />
              </Link>
            )}
            {player.rank !== null && (
              <Link
                href="/live#top-rich"
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-white/10"
                aria-label={`Место в топе: ${player.rank}`}
              >
                <span aria-hidden>🏆</span>
                <span className="font-mono">#{player.rank}</span>
              </Link>
            )}
            {player.balance !== null && (
              <Link
                href="/inventory"
                className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25"
                aria-label={`Баланс: ${fmt(player.balance)} ешек`}
              >
                <span className="type-economy">{fmt(player.balance)}</span>
                <VoznyaCoin tone="gold" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
