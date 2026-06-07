import { rarityToken } from '@/lib/rarity'
import { RarityBadge } from '@/components/v2/rarity-badge'
import type { ShowcaseGift } from '@/lib/gifts'

/**
 * GiftCard (V3, поверхность №4) — Telegram Gift как ценная коллекционная вещь,
 * не строка таблицы: крупная иконка в «капсуле» с цветом редкости, свечение,
 * метки лимитки/остатка/«забрали N раз», цена в ешках. Server component.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function GiftCard({ gift }: { gift: ShowcaseGift }) {
  const t = rarityToken(gift.rarity)
  const lowStock = gift.remaining != null && gift.remaining <= 5

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-3xl border bg-white/[0.02] p-5 transition hover:-translate-y-1"
      style={{
        borderColor: gift.rarity === 'common' ? 'rgba(255,255,255,0.1)' : t.color,
        boxShadow: gift.rarity === 'common' ? undefined : t.glow || undefined,
      }}
    >
      {/* Фон-свечение редкости */}
      {gift.rarity !== 'common' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-40 blur-3xl transition group-hover:opacity-60"
          style={{ backgroundColor: t.color }}
        />
      )}

      {/* Метки сверху */}
      <div className="relative mb-3 flex items-center justify-between">
        <RarityBadge rarity={gift.rarity} />
        {gift.limited && (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Лимитка
          </span>
        )}
      </div>

      {/* Капсула с подарком */}
      <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-2xl text-5xl"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${t.color}33, transparent 70%)`,
        }}
      >
        <span aria-hidden="true">{gift.icon}</span>
      </div>

      {/* Имя + описание */}
      <h3 className="relative text-center text-base font-bold text-foreground">{gift.name}</h3>
      {gift.description && (
        <p className="relative mt-1 line-clamp-2 text-center text-xs text-muted-foreground">
          {gift.description}
        </p>
      )}

      {/* Низ: цена + дефицит/популярность */}
      <div className="relative mt-4 flex flex-col items-center gap-1.5">
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
    </article>
  )
}
