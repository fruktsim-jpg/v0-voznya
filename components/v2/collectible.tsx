import type { ReactNode } from 'react'
import { rarityToken, type Rarity } from '@/lib/rarity'
import { RarityBadge } from '@/components/v2/rarity-badge'

/**
 * CollectibleTile (V3, Polish Pass) — ЕДИНЫЙ визуальный язык коллекционных
 * объектов Возни: достижения, подарки, награды кейсов, предметы инвентаря.
 * Один мир — одна карточка. Капсула с радиальным свечением цвета редкости,
 * рамка/glow по тиру, опц. бейдж редкости, верхняя метка (лимит/джекпот),
 * заголовок, подзаголовок и низ (цена/шанс/значение). Server component.
 *
 * Цель: чтобы Gift, Reward, Achievement и Item читались как часть одной
 * системы. Существующие карточки можно постепенно перевести на этот primitive.
 */
export function CollectibleTile({
  icon,
  title,
  subtitle,
  rarity = 'common',
  badge,
  topRight,
  footer,
  locked = false,
  size = 'md',
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  rarity?: Rarity
  /** Показать бейдж редкости под капсулой. */
  badge?: boolean
  /** Метка в правом верхнем углу (например «Лимитка», «💎 джекпот»). */
  topRight?: ReactNode
  /** Нижняя строка: цена, шанс, значение и т.п. */
  footer?: ReactNode
  locked?: boolean
  size?: 'sm' | 'md'
}) {
  const t = rarityToken(rarity)
  const dim = size === 'sm' ? 'h-16 w-16 text-3xl' : 'h-24 w-24 text-5xl'
  const accent = rarity !== 'common' && !locked

  return (
    <article
      className={`group relative flex flex-col items-center overflow-hidden rounded-3xl border bg-white/[0.02] p-4 text-center transition ${
        locked ? 'opacity-50 grayscale' : 'hover:-translate-y-0.5'
      }`}
      style={{
        borderColor: accent ? t.color : 'rgba(255,255,255,0.1)',
        boxShadow: accent ? t.glow || undefined : undefined,
      }}
    >
      {topRight && <div className="absolute right-2 top-2 z-10">{topRight}</div>}

      {/* Свечение-фон */}
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full opacity-40 blur-3xl transition group-hover:opacity-60"
          style={{ backgroundColor: t.color }}
        />
      )}

      {/* Капсула */}
      <div
        className={`relative mb-2 flex items-center justify-center rounded-2xl ${dim}`}
        style={{ background: `radial-gradient(circle at 50% 35%, ${t.color}33, transparent 70%)` }}
      >
        <span aria-hidden="true">{locked ? '🔒' : icon}</span>
      </div>

      <h3 className="relative line-clamp-1 text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && (
        <p className="relative mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{subtitle}</p>
      )}

      {badge && !locked && (
        <div className="relative mt-2">
          <RarityBadge rarity={rarity} />
        </div>
      )}

      {footer && <div className="relative mt-2 w-full">{footer}</div>}
    </article>
  )
}
