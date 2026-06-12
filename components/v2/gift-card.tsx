import { rarityToken } from '@/lib/rarity'
import { CollectibleTile } from '@/components/v2/collectible'
import { GiftBuyButton } from '@/components/v2/gift-buy-button'
import type { ShowcaseGift } from '@/lib/gifts'


/**
 * GiftCard (App Redesign V1) — Telegram Gift поверх единого CollectibleTile,
 * чтобы подарки, награды, достижения и предметы читались как один мир. Плотная
 * карточка: только название, цена цветом редкости и метка лимитки/низкого
 * остатка. Описание и «забрали N» убраны как шум, не влияющий на решение.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function GiftCard({ gift }: { gift: ShowcaseGift }) {
  const t = rarityToken(gift.rarity)
  const lowStock = gift.remaining != null && gift.remaining <= 5

  return (
    <CollectibleTile
      icon={gift.icon}
      code={gift.code}
      itemClass="gift"
      title={gift.name}
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
          {lowStock && gift.remaining != null && (
            <span className="text-[11px] font-semibold text-amber-300">
              🔥 осталось {fmt(gift.remaining)}
            </span>
          )}
          {/* Рабочая покупка (Release 2.2): подарок уходит в инвентарь как
              pending, дальше игрок решает — хранить/продать/вывести. */}
          <GiftBuyButton
            code={gift.code}
            name={gift.name}
            rarity={gift.rarity}
            priceEshki={gift.priceEshki}
            color={t.color}
          />
        </div>
      }

    />
  )
}
