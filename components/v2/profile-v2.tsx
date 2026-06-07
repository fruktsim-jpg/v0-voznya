'use client'

import { useState } from 'react'
import { Card } from '@/components/v2/card'
import { StatCard } from '@/components/v2/stat-card'
import { EmptyState } from '@/components/v2/empty-state'
import { ActivityCard } from '@/components/v2/activity-card'
import type { CommunityEvent } from '@/lib/events'

/**
 * Профиль V2 (Phase 1 foundation, VOZNYA_UI_UX_V2 §6). Hero-паспорт + вкладки
 * (Активность / Достижения / Подарки / Статистика). Presentational: получает
 * данные пропсами; новых источников данных не добавляет. Client — ради вкладок.
 */

export type ProfileV2Data = {
  userId: number
  name: string
  title?: string | null
  avatar?: string | null
  rank?: string | null
  mmr?: number | null
  balance: number
  totalEarned?: number | null
  reputation?: number | null
  achievementsCount?: number | null
  /** Личная лента (может быть пустой — покажем EmptyState). */
  activity?: CommunityEvent[]
}

const TABS = [
  { key: 'activity', label: 'Активность' },
  { key: 'achievements', label: 'Достижения' },
  { key: 'gifts', label: 'Подарки' },
  { key: 'stats', label: 'Статистика' },
] as const

type TabKey = (typeof TABS)[number]['key']

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function ProfileV2({ data }: { data: ProfileV2Data }) {
  const [tab, setTab] = useState<TabKey>('activity')
  const initial = data.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Hero */}
      <Card variant="elevated" className="mb-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary/20 text-3xl font-bold text-primary ring-2 ring-primary/30"
            aria-hidden="true"
          >
            {data.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatar} alt="" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="truncate text-2xl font-bold text-foreground">{data.name}</h1>
            {data.title && (
              <span className="mt-1 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                {data.title}
              </span>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {data.rank && (
                <span className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">
                  Ранг: <span className="text-foreground">{data.rank}</span>
                  {data.mmr != null && <span className="text-muted-foreground"> · {fmt(data.mmr)} MMR</span>}
                </span>
              )}
              <span className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">
                Баланс: <span className="text-foreground">{fmt(data.balance)} ешек</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Быстрая статистика */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="💰" value={fmt(data.balance)} label="Баланс" />
        <StatCard icon="📈" value={fmt(data.totalEarned ?? 0)} label="Заработано всего" />
        <StatCard icon="⭐" value={fmt(data.reputation ?? 0)} label="Репутация" />
        <StatCard icon="🏆" value={fmt(data.achievementsCount ?? 0)} label="Достижений" />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-white/10 text-muted-foreground hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'activity' &&
        (data.activity && data.activity.length > 0 ? (
          <ul className="space-y-2">
            {data.activity.map((e) => (
              <li key={e.id}>
                <ActivityCard event={e} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="🌙"
            title="Пока нет активности"
            description="Открывай кейсы, получай достижения и дари подарки — события появятся здесь."
          />
        ))}

      {tab === 'achievements' && (
        <EmptyState
          icon="🏆"
          title="Достижения скоро"
          description="Витрина достижений с прогрессом появится на следующем этапе."
        />
      )}

      {tab === 'gifts' && (
        <EmptyState
          icon="🎁"
          title="Коллекция подарков скоро"
          description="Здесь будут полученные Telegram Gifts и косметика с редкостью."
        />
      )}

      {tab === 'stats' && (
        <EmptyState
          icon="📊"
          title="Детальная статистика скоро"
          description="Казино, дуэли, ферма и графики — на следующем этапе."
        />
      )}
    </div>
  )
}
