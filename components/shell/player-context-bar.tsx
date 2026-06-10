'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/ds/avatar'
import { onBalanceChanged } from '@/lib/balance-events'

/**
 * PlayerContextBar (Redesign V2, Stage 1) — постоянный «якорь прогрессии»:
 * аватар + имя + баланс ешек + место в топе. То, чего не хватало (Redesign
 * Master Plan §1.2 P3): ценные числа всегда под рукой, без захода в профиль.
 *
 * Источник данных — СУЩЕСТВУЮЩИЙ read-only `/api/me/summary` (тот же, что у
 * UserMenu). Никаких новых контрактов и никакой записи: бот владеет `users`.
 * Обновляется в реальном времени по событию onBalanceChanged (кейс/продажа/
 * покупка) — баланс меняется без F5.
 *
 * Позиционирование: фиксированная полоса прямо под шапкой (h-14 = 3.5rem +
 * safe-area). Чтобы не ломать верхние отступы 34 страниц, при появлении бара
 * вешаем на <body> класс `has-context-bar`; общие утилиты `.pt-header` и
 * `.pt-hero-safe` в globals.css увеличивают отступ ТОЛЬКО при этом классе.
 * Поэтому гости и незарегистрированные видят прежний макет без изменений.
 *
 * Видимость:
 *  - скрыт в админке (свой shell);
 *  - скрыт для гостей и незарегистрированных (для них — лендинг/онбординг);
 *  - поля keys / mmr / division зарезервированы под Stage 6.
 */
type Summary =
  | { authenticated: false }
  | {
      authenticated: true
      userId: number
      registered: boolean
      name: string | null
      balance: number | null
      rank: number | null
      photoUrl?: string | null
      isAdmin?: boolean
    }

function formatEsh(n: number): string {
  return n.toLocaleString('ru-RU')
}

export function PlayerContextBar() {
  const pathname = usePathname() || '/'
  const [data, setData] = useState<Summary | null>(null)

  const refresh = useCallback(() => {
    let alive = true
    fetch('/api/me/summary', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Summary>) : Promise.reject()))
      .then((d) => {
        if (alive) setData(d)
      })
      .catch(() => {
        if (alive) setData((prev) => prev ?? { authenticated: false })
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => refresh(), [refresh])
  useEffect(() => onBalanceChanged(refresh), [refresh])

  const visible =
    !pathname.startsWith('/admin') &&
    !!data &&
    data.authenticated &&
    data.registered

  // Toggle the global padding compensation only while the bar is visible.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('has-context-bar', visible)
    return () => {
      document.body.classList.remove('has-context-bar')
    }
  }, [visible])

  if (!visible) return null
  // Narrowing for TS: visible implies authenticated.
  const d = data as Extract<Summary, { authenticated: true }>

  const displayName = d.name?.trim() || 'Игрок'
  const profileHref = `/profile/${d.userId}`

  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={profileHref}
          className="flex min-w-0 items-center gap-2 transition hover:opacity-90"
          aria-label="Открыть профиль"
        >
          <Avatar src={d.photoUrl} name={displayName} size="sm" />
          <span className="hidden min-w-0 truncate text-sm font-semibold text-foreground sm:inline">
            {displayName}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {d.rank !== null && (
            <Link
              href="/live#top-rich"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              aria-label={`Место в топе: ${d.rank}`}
            >
              <span aria-hidden="true">🏆</span>
              <span className="font-mono tabular-nums">#{d.rank}</span>
            </Link>
          )}
          {d.balance !== null && (
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25"
              aria-label={`Баланс: ${formatEsh(d.balance)} ешек`}
            >
              <span className="font-mono tabular-nums">{formatEsh(d.balance)}</span>
              <span aria-hidden="true">🥚</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
