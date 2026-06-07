import { Card } from '@/components/v2/card'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { UserBadge } from '@/components/v2/user-badge'
import { rarityToken } from '@/lib/rarity'
import { eventText, timeAgo, type CommunityEvent } from '@/lib/events'

/**
 * ActivityCard — карточка одного события ленты (VOZNYA_EVENTS_SYSTEM §5).
 * Server component. Вариант карточки зависит от редкости события: epic/legendary/
 * mythic получают подсветку и рамку.
 */
export function ActivityCard({ event }: { event: CommunityEvent }) {
  const token = rarityToken(event.rarity)
  const highlight =
    event.rarity === 'legendary' || event.rarity === 'mythic'
      ? 'legendary'
      : event.rarity === 'epic'
        ? 'epic'
        : 'default'

  return (
    <Card variant={highlight as 'default' | 'epic' | 'legendary'} className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg"
        style={{
          color: token.color,
          boxShadow: token.glow || undefined,
          background: 'rgba(255,255,255,0.04)',
        }}
        aria-hidden="true"
      >
        {event.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <UserBadge name={event.actor.name} userId={event.actor.id} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {eventText(event)}
          {event.value != null && (
            <span className="ml-1 font-medium text-foreground">
              · {event.value.toLocaleString('ru-RU')}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {(event.rarity === 'epic' ||
          event.rarity === 'legendary' ||
          event.rarity === 'mythic') && <RarityBadge rarity={event.rarity} />}
        <span className="text-[11px] text-muted-foreground/70">
          {timeAgo(event.occurredAt)}
        </span>
      </div>
    </Card>
  )
}
