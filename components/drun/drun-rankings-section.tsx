import { Glyph } from '@/components/ds/icon'
import { PlayerLink } from '@/components/ui/player-link'
import type { DrunRankings, DrunRankedPlayer } from '@/lib/drun-rankings'

/**
 * "Любимчики и на карандаше" — read-only Drun social rankings (Phase B #5).
 *
 * Renders the two ends of opinions.rank_chat: who Drun gravitates toward and who
 * is on his notice list. Pure presentation over `DrunRankings`; the page omits
 * it when `hasContent` is false.
 */

function Row({ player, positive }: { player: DrunRankedPlayer; positive: boolean }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] px-3 py-2">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
          positive ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'
        }`}
      >
        <Glyph name={positive ? 'heart' : 'flame'} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <PlayerLink
          userId={player.userId}
          name={player.name}
          className="block truncate text-sm font-semibold text-foreground hover:underline"
        />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {player.standing}
        </span>
      </div>
    </li>
  )
}

export function DrunRankingsSection({ data }: { data: DrunRankings }) {
  if (!data.hasContent) return null
  const { favorites, onNotice } = data

  return (
    <section className="mx-auto mt-4 max-w-2xl px-4 sm:mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Glyph name="users" className="h-4 w-4 text-primary" />
        <h2 className="section-title text-base text-foreground sm:text-lg">Друн о людях</h2>
        <span className="text-[11px] text-muted-foreground">· кого он выделяет</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {favorites.length > 0 && (
          <div className="glass rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/[0.05] to-transparent p-4 sm:p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <Glyph name="heart" className="h-3.5 w-3.5 text-emerald-300" />
              <span className="label-eyebrow">Любимчики</span>
            </div>
            <ul className="space-y-2">
              {favorites.map((p) => (
                <Row key={p.userId} player={p} positive />
              ))}
            </ul>
          </div>
        )}

        {onNotice.length > 0 && (
          <div className="glass rounded-2xl border border-rose-400/25 bg-gradient-to-br from-rose-400/[0.05] to-transparent p-4 sm:p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <Glyph name="flame" className="h-3.5 w-3.5 text-rose-300" />
              <span className="label-eyebrow">На карандаше</span>
            </div>
            <ul className="space-y-2">
              {onNotice.map((p) => (
                <Row key={p.userId} player={p} positive={false} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
