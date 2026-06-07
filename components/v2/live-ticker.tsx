import { rarityToken } from '@/lib/rarity'
import { eventText, type CommunityEvent } from '@/lib/events'

/**
 * LiveTicker — горизонтальная «бегущая» лента самых ярких событий (epic+).
 * Server component, чистый CSS-маркизы (анимация в globals при наличии; здесь —
 * прокручиваемый ряд). Создаёт ощущение «тут постоянно что-то происходит».
 */
export function LiveTicker({ events }: { events: CommunityEvent[] }) {
  const hot = events.filter(
    (e) => e.rarity === 'epic' || e.rarity === 'legendary' || e.rarity === 'mythic',
  )
  if (hot.length === 0) return null

  return (
    <div className="border-y border-white/10 bg-white/[0.02]">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {hot.map((e) => {
          const t = rarityToken(e.rarity)
          return (
            <span
              key={e.id}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: t.color, boxShadow: t.glow || undefined }}
            >
              <span aria-hidden="true">{e.icon}</span>
              <span className="font-medium text-foreground">{e.actor.name}</span>
              <span className="text-muted-foreground">{eventText(e)}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
