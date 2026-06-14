import { UserBadge } from '@/components/v2/user-badge'
import { eventText, timeAgo, eventHeat, type CommunityEvent } from '@/lib/events'
import { rarityToken } from '@/lib/rarity'
import { ItemArt } from '@/components/ds/item-art'

/**
 * ActivityCard — one Live Feed row, weighted by IMPORTANCE, not chronology.
 *
 * Visual reset: the feed used to render every event as the same glass card, so a
 * jackpot and a routine farm looked identical. Now `eventHeat` (lib/events) ranks
 * each event into three weights, and the row renders at a matching size so the
 * stream reads as a living world — loud moments and quiet background activity:
 *
 *   - headline → world-stopping (jackpot, big win, legendary/mythic drop, new
 *     family): big art, bold name, loud coloured value, a thin rarity rule and a
 *     "Момент" tag. Impossible to miss.
 *   - notable  → above-the-noise (rare drop, rank-up, high value): medium row,
 *     coloured value, rarity label.
 *   - ambient  → routine: compact one-liner, no decoration.
 *
 * Server component. Importance comes from layout/size/typography — not glow.
 */
export function ActivityCard({ event: e }: { event: CommunityEvent }) {
  const heat = eventHeat(e)
  const token = rarityToken(e.rarity)

  if (heat === 'headline') {
    return (
      <div
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-white/[0.03] p-3.5"
        style={{ borderColor: `${token.color}55` }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(to right, ${token.color}aa, transparent 70%)` }}
        />
        <ItemArt
          code={e.itemCode}
          itemClass={e.itemClass}
          glyph={e.icon}
          rarity={e.rarity}
          size="md"
          className="!h-12 !w-12 !rounded-2xl shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ color: token.color, background: `${token.color}1f` }}
            >
              Момент
            </span>
            <UserBadge name={e.actor.name} userId={e.actor.id} avatar={e.actor.avatar} size="sm" />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{eventText(e)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {e.value != null && (
            <span className="type-economy text-base" style={{ color: token.color }}>
              +{e.value.toLocaleString('ru-RU')}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/70">{timeAgo(e.occurredAt)}</span>
        </div>
      </div>
    )
  }

  if (heat === 'notable') {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5">
        <ItemArt
          code={e.itemCode}
          itemClass={e.itemClass}
          glyph={e.icon}
          rarity={e.rarity}
          size="sm"
          className="!h-9 !w-9 !rounded-xl shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">
            <UserBadge name={e.actor.name} userId={e.actor.id} avatar={e.actor.avatar} size="sm" />
          </div>
          <p className="truncate text-xs text-muted-foreground">{eventText(e)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {e.value != null && (
            <span className="type-economy text-sm" style={{ color: token.color }}>
              +{e.value.toLocaleString('ru-RU')}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/70">{timeAgo(e.occurredAt)}</span>
        </div>
      </div>
    )
  }

  // ambient — compact one-liner, no decoration.
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5">
      <ItemArt
        code={e.itemCode}
        itemClass={e.itemClass}
        glyph={e.icon}
        rarity={e.rarity}
        size="sm"
        className="!h-6 !w-6 !rounded-lg !text-sm shrink-0"
      />
      <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">{e.actor.name}</span> {eventText(e)}
        {e.value != null && (
          <span className="ml-1 font-medium text-foreground">
            · {e.value.toLocaleString('ru-RU')}
          </span>
        )}
      </p>
      <span className="shrink-0 text-[10px] text-muted-foreground/60">{timeAgo(e.occurredAt)}</span>
    </div>
  )
}
