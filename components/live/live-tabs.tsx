'use client'

import { useState, type ReactNode } from 'react'

/**
 * LiveTabs (App Redesign V1) — превращает километровую простыню /live в
 * приложение с вкладками. Серверные панели рендерятся как и раньше (каждая
 * сама тянет данные), но передаются сюда как children по табам, а клиент лишь
 * переключает видимость. Данные не дублируются и не меняется их источник —
 * это чистый UX-слой. Скрытые табы остаются в DOM (display:none), поэтому
 * данные не перезапрашиваются при переключении.
 */
export function LiveTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[]
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')

  return (
    <>
      {/* Табы — sticky под шапкой, как сегментированный контрол приложения. */}
      <div className="sticky top-14 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-current={active === t.id ? 'true' : undefined}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                active === t.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tabs.map((t) => (
        <div key={t.id} hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </>
  )
}
