import { rarityToken } from '@/lib/rarity'
import type { CommunityEvent } from '@/lib/events'

/**
 * DropTicker — живая вертикальная лента последних открытий кейсов. Создаёт
 * ощущение «здесь постоянно что-то выбивают» и готовит глаз к будущей
 * горизонтальной рулетке (тот же визуальный язык движущейся ленты).
 *
 * Read-only: данные приходят из реальной ленты (case_openings через
 * getCommunityFeed). Чистая CSS-анимация (animate-drop-ticker в globals.css),
 * без клиентского JS — server component. Пауза при наведении. Лента
 * дублируется, чтобы прокрутка была бесшовной.
 */
export function DropTicker({ events }: { events: CommunityEvent[] }) {
  if (events.length === 0) return null

  // Бесшовный цикл: рендерим список дважды и прокручиваем на -50%.
  const loop = [...events, ...events]

  return (
    <div className="group glass relative h-64 overflow-hidden rounded-2xl border border-border">
      <div
        className="absolute inset-x-0 top-0 flex flex-col gap-1.5 p-2 will-change-transform animate-drop-ticker group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${Math.max(events.length, 4) * 2.2}s` }}
      >
        {loop.map((e, i) => {
          const t = rarityToken(e.rarity)
          const accent = e.rarity !== 'common'
          return (
            <div
              key={`${e.id}-${i}`}
              className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs"
              style={{
                borderColor: accent ? `${t.color}55` : 'rgba(255,255,255,0.06)',
                background: accent ? `${t.color}12` : 'rgba(255,255,255,0.02)',
              }}
            >
              <span aria-hidden="true" className="text-base">
                {e.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">
                {e.actor.name}
              </span>
              {e.value != null && (
                <span className="shrink-0 font-mono font-semibold" style={{ color: t.color }}>
                  {e.value.toLocaleString('ru-RU')}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Маска по краям — лента «утекает» вверх и вниз. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--background) 0%, transparent 18%, transparent 82%, var(--background) 100%)',
        }}
      />
    </div>
  )
}
