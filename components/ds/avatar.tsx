import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Avatar (DS) — единый аватар: реальное фото Telegram, иначе градиентная
 * заглушка с инициалом. Опц. индикатор онлайна и слот рамки (frame) для
 * косметики профиля. Server component (без состояния).
 *
 * Не использует next/image: проект собирается с `images.unoptimized` и фото
 * приходят с внешних доменов Telegram (см. next.config.mjs / AGENTS.md).
 */
const SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
  xl: 'h-20 w-20 text-3xl',
} as const

export function Avatar({
  src,
  name,
  size = 'md',
  online,
  frame,
  className = '',
}: {
  src?: string | null
  name?: string | null
  size?: keyof typeof SIZES
  /** Точка присутствия: true — онлайн (зелёная), false — оффлайн (серая), undefined — скрыта. */
  online?: boolean
  /** Слой рамки поверх аватара (косметика). */
  frame?: ReactNode
  className?: string
}) {
  const initial =
    (name?.trim().replace(/^@/, '').charAt(0).toUpperCase() || '👤')

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className={cn(
            SIZES[size],
            'rounded-full object-cover shadow-inner ring-1 ring-white/15',
          )}
        />
      ) : (
        <span
          className={cn(
            SIZES[size],
            'flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground shadow-inner',
          )}
        >
          {initial}
        </span>
      )}

      {frame && (
        <span className="pointer-events-none absolute inset-0" aria-hidden="true">
          {frame}
        </span>
      )}

      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
            online ? 'bg-[#22c55e]' : 'bg-zinc-500',
          )}
          aria-label={online ? 'онлайн' : 'оффлайн'}
        />
      )}
    </span>
  )
}
