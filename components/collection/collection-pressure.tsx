import type { CollectionProgress } from '@/lib/collection-progress'

/**
 * CollectionPressure — read-only progress strip surfaced inside existing
 * screens (Inventory, Profile, Cases). Answers the collection-loop questions:
 * owned / total, missing, completion %, and ownership-rarity (how rare the
 * finished set is). No dedicated destination; this seeds desire in place.
 */
export function CollectionPressure({
  collections,
  title = 'Коллекции',
  limit,
}: {
  collections: CollectionProgress[]
  title?: string
  limit?: number
}) {
  if (!collections || collections.length === 0) return null
  const list = limit ? collections.slice(0, limit) : collections

  return (
    <section className="glass mt-4 rounded-2xl border border-border p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((c) => {
          const pctv = c.total > 0 ? Math.round((c.owned / c.total) * 100) : 0
          return (
            <div
              key={c.code}
              className={`rounded-xl border p-3 ${
                c.completed ? 'border-amber-400/40 bg-amber-400/[0.06]' : 'border-white/8 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">🧩 {c.name}</span>
                <span className={`shrink-0 text-xs font-semibold ${c.completed ? 'text-amber-300' : 'text-muted-foreground'}`}>
                  {c.owned}/{c.total}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-white/10">
                <div
                  className={c.completed ? 'h-full bg-amber-400' : 'h-full bg-primary'}
                  style={{ width: `${pctv}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                {c.completed ? (
                  <span className="font-medium text-amber-300">Собрано полностью</span>
                ) : (
                  <span className="text-muted-foreground">осталось {c.missing}</span>
                )}
                {c.completedByPlayers > 0 && (
                  <span className="text-muted-foreground">
                    собрали {c.completedByPlayers}{' '}
                    {c.completedByPlayers === 1 ? 'игрок' : 'игроков'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
