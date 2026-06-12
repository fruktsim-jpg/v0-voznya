import Link from 'next/link'
import { Glyph, type GlyphName } from '@/components/ds/icon'

/**
 * QuickActions (App Redesign V1) — дашбордовый блок быстрых входов на главной.
 * Превращает «лендинг» в «приложение»: сразу после Hero игрок видит, куда идти
 * — Кейсы / Подарки / Live / Казино — крупными тап-целями, как иконки на
 * домашнем экране телефона. Чистые ссылки на существующие страницы.
 *
 * B1 (icon system): emoji icons replaced with owned line glyphs (functional
 * register), tinted by context accent.
 */
const ACTIONS: { href: string; icon: GlyphName; label: string; hint: string; accent: string }[] = [
  { href: '/cases', icon: 'case', label: 'Кейсы', hint: 'Открывай и лови дроп', accent: 'var(--accent-indigo)' },
  { href: '/gifts', icon: 'gift', label: 'Магазин', hint: 'Подарки и Premium за ешки', accent: 'var(--accent-pink)' },
  { href: '/live', icon: 'pulse', label: 'Live', hint: 'Статистика и топы', accent: 'var(--accent-teal)' },
  { href: '/casino', icon: 'dice', label: 'Казино', hint: 'Азартная часть', accent: 'var(--accent-gold)' },
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
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: `${a.accent}1A`, color: a.accent }}
              aria-hidden="true"
            >
              <Glyph name={a.icon} />
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
