import type { ReactNode } from 'react'
import { rarityToken, type Rarity } from '@/lib/rarity'
import { cn } from '@/lib/utils'

/**
 * ItemArt (DS) — арт-капсула коллекционного объекта (предмет инвентаря, подарок,
 * награда кейса). Заменяет «эмодзи-как-арт» единым премиальным контейнером.
 *
 * Прогрессивное улучшение, без блокеров по ассетам:
 *   1) если есть `src` (payload/изображение) — показываем картинку;
 *   2) иначе — глиф (эмодзи/иконка) на радиальной подложке цвета редкости.
 * Рамка и свечение — по тиру. Server component.
 *
 * Это presentational-слой: компонент не знает о данных, ему передают готовые
 * src/glyph/rarity. Никаких сетевых запросов и записи.
 */
const SIZES = {
  sm: 'h-14 w-14 text-2xl rounded-xl',
  md: 'h-20 w-20 text-4xl rounded-2xl',
  lg: 'h-28 w-28 text-6xl rounded-2xl',
  xl: 'h-40 w-40 text-8xl rounded-3xl',
} as const

export function ItemArt({
  src,
  glyph,
  rarity = 'common',
  size = 'md',
  locked = false,
  className = '',
}: {
  /** URL арта предмета. Если задан — рендерится изображение. */
  src?: string | null
  /** Запасной глиф (эмодзи/иконка), когда арта нет. */
  glyph?: ReactNode
  rarity?: Rarity
  size?: keyof typeof SIZES
  locked?: boolean
  className?: string
}) {
  const t = rarityToken(rarity)
  const accent = rarity !== 'common' && !locked

  return (
    <span
      className={cn(
        'relative flex items-center justify-center overflow-hidden border',
        SIZES[size],
        locked ? 'opacity-50 grayscale' : '',
        className,
      )}
      style={{
        background: t.capsule,
        borderColor: accent ? t.color : 'rgba(255,255,255,0.10)',
        boxShadow: accent ? t.glow || undefined : undefined,
      }}
    >
      {/* Фоновое свечение тира */}
      {accent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1/3 left-1/2 h-full w-full -translate-x-1/2 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: t.color }}
        />
      )}

      {locked ? (
        <span aria-hidden="true" className="relative">🔒</span>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="relative h-full w-full object-contain"
        />
      ) : (
        <span aria-hidden="true" className="relative">
          {glyph ?? '📦'}
        </span>
      )}
    </span>
  )
}
