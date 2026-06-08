import Link from 'next/link'

/**
 * QuickActions (App Redesign V1) — дашбордовый блок быстрых входов на главной.
 * Превращает «лендинг» в «приложение»: сразу после Hero игрок видит, куда идти
 * — Кейсы / Подарки / Live / Казино — крупными тап-целями, как иконки на
 * домашнем экране телефона. Чистые ссылки на существующие страницы.
 */
const ACTIONS = [
  { href: '/cases', icon: '📦', label: 'Кейсы', hint: 'Открывай и лови дроп' },
  { href: '/gifts', icon: '🎁', label: 'Подарки', hint: 'Коллекция Telegram Gifts' },
  { href: '/live', icon: '🔥', label: 'Live', hint: 'Статистика и топы' },
  { href: '/casino', icon: '🎰', label: 'Казино', hint: 'Азартная часть' },
]

export function QuickActions() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="glass flex items-center gap-3 rounded-2xl border border-border p-3 transition active:scale-[0.98] hover:border-primary/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl" aria-hidden="true">
              {a.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-foreground">{a.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{a.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
