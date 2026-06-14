'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * LiveTabs (App Redesign V1) — превращает километровую простыню /live в
 * приложение с вкладками. Серверные панели рендерятся как и раньше (каждая
 * сама тянет данные), но передаются сюда как children по табам, а клиент лишь
 * переключает видимость. Данные не дублируются и не меняется их источник —
 * это чистый UX-слой. Скрытые табы остаются в DOM (display:none), поэтому
 * данные не перезапрашиваются при переключении.
 *
 * Track 1 (deep-link fix): раньше ссылки вида `/live#top-rich`, `#families`,
 * `#titles` молча не работали — целевая секция жила в СКРЫТОМ табе, а
 * `ScrollToAnchor` нигде не монтировался. Теперь LiveTabs сам читает hash,
 * находит таб, внутри которого лежит элемент с этим id (через `data-tab-id`),
 * активирует его и плавно скроллит. Работает и при навигации по hash на той же
 * странице (`hashchange`). Это чинит 14+ ссылок из nav/profile/quick-links
 * одним местом, без конфигурации по каждому якорю.
 */
export function LiveTabs({
  tabs,
}: {
  tabs: { id: string; label: ReactNode; content: ReactNode }[]
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')
  const containerRef = useRef<HTMLDivElement>(null)

  // Найти таб, который содержит элемент с данным id, активировать и доскроллить.
  const focusAnchor = useCallback((rawHash: string) => {
    // Берём только ПОСЛЕДНИЙ сегмент: ссылки вида `/live#top-rich`, нажатые при
    // уже стоящем хэше, иногда дают `#top-rich#top-rich` — нормализуем.
    const id = rawHash.replace(/^#/, '').split('#').filter(Boolean).pop() ?? ''
    if (!id) return
    const root = containerRef.current
    if (!root) return
    // Скрытые табы остаются в DOM, поэтому элемент находится даже в неактивном табе.
    const target = root.querySelector(`#${CSS.escape(id)}`)
    if (!target) return
    const owner = target.closest<HTMLElement>('[data-tab-id]')
    const tabId = owner?.dataset.tabId
    if (tabId) setActive(tabId)
    // Подождать, пока таб станет видимым (hidden снимется), затем плавно скроллить.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(id)
        if (!el) return
        const y = el.getBoundingClientRect().top + window.pageYOffset - 72
        window.scrollTo({ top: y, behavior: 'smooth' })
      }, 60)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash) focusAnchor(window.location.hash)
    const onHash = () => focusAnchor(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [focusAnchor])

  return (
    <div ref={containerRef}>
      {/* Табы — sticky под шапкой, как сегментированный контрол приложения. */}
      <div className="sticky top-14 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-current={active === t.id ? 'true' : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
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
        <div key={t.id} data-tab-id={t.id} hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </div>
  )
}
