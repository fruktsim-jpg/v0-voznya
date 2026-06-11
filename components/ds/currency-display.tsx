import { cn } from '@/lib/utils'
import { VoznyaCoin } from '@/components/ds/coin'

/**
 * CurrencyDisplay (DS) — отображение баланса игрока в шапке/контексте.
 *
 * VOZNYA REDESIGN: визуальный референс Figma показывает ДВЕ валюты. У Возни
 * сейчас одна реальная валюта — ешки. Мы закладываем второй слот («самоцветы»)
 * как ЧИСТО ВИЗУАЛЬНЫЙ задел на будущее (премиум-валюта/монетизация) — он НЕ
 * подключён к экономике и рендерится только когда явно передан `gems`.
 *
 * B3 (currency identity): ешка — это теперь чеканная монета `VoznyaCoin`
 * (owned SVG), а не emoji. Никакой бизнес-логики здесь нет, presentational.
 *
 * Server component.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

export function CurrencyDisplay({
  esh,
  gems,
  size = 'md',
  className = '',
}: {
  /** Баланс в ешках (реальная валюта). */
  esh: number
  /**
   * Премиум-валюта (самоцветы). FUTURE-PROOF UI-ONLY: передавай только когда
   * вторая валюта реально появится. Сейчас НЕ прокидывается из данных.
   */
  gems?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm'
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-[#FFD700]/25 bg-[#FFD700]/10 font-bold tabular-nums text-[#FFD700]',
          pad,
        )}
        aria-label={`Баланс: ${fmt(esh)} ешек`}
      >
        <VoznyaCoin tone="gold" />
        <span className="type-economy">{fmt(esh)}</span>
      </span>
      {typeof gems === 'number' ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-[#4B69FF]/25 bg-[#4B69FF]/10 font-bold tabular-nums text-[#7C93FF]',
            pad,
          )}
          aria-label={`Самоцветы: ${fmt(gems)}`}
        >
          <span aria-hidden>💎</span>
          <span className="type-economy">{fmt(gems)}</span>
        </span>
      ) : null}
    </div>
  )
}
