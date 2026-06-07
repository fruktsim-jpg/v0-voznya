import { rarityToken } from '@/lib/rarity'
import { CollectibleTile } from '@/components/v2/collectible'
import type { ShowcaseGift } from '@/lib/gifts'

/**
 * GiftCard (V3, Polish Pass) — Telegram Gift поверх единого CollectibleTile,
 * чтобы подарки, награды, достижения и предметы читались как один мир.
 * Метки лимитки/остатка/«забрали N», цена в ешках цветом редкости.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function GiftCard({ gift }: { gift: ShowcaseGift }) {
  const t = rarityToken(gift.rarity)
  const lowStock = gift.remaining != null && gift.remaining <= 5

  return (
    <CollectibleTile
      icon={gift.icon}
      title={gift.name}
      subtitle={gift.description ?? undefined}
      rarity={gift.rarity}
      badge
      topRight={
        gift.limited ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Лимитка
          </span>
        ) : undefined
      }
      footer={
        <div className="flex flex-col items-center gap-1">
          <span
            className="rounded-full border px-3 py-1 text-sm font-semibold"
            style={{ borderColor: `${t.color}66`, color: t.color }}
          >
            {fmt(gift.priceEshki)} ешек
          </span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {gift.remaining != null && (
              <span className={lowStock ? 'font-semibold text-amber-300' : ''}>
                {lowStock ? `🔥 осталось ${fmt(gift.remaining)}` : `осталось ${fmt(gift.remaining)}`}
              </span>
            )}
            {gift.soldCount > 0 && <span>· забрали {fmt(gift.soldCount)}</span>}
          </div>
        </div>
      }
    />
  )
}
