import { PlayerSearch } from '@/components/admin/player-search'

export const dynamic = 'force-dynamic'

/**
 * Player search page. The dashboard already embeds the same search, but this
 * dedicated route is kept for the nav/back-compat. Reuses the shared
 * <PlayerSearch /> component so behaviour stays identical everywhere.
 */
export default function PlayersSearchPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Игроки</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Найди игрока по id, @username или имени.
      </p>
      <PlayerSearch />
    </div>
  )
}
