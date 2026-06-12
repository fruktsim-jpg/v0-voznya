import Link from 'next/link'
import { getAdminSession } from '@/lib/auth/admin-session'
import { getSession } from '@/lib/auth/get-session'
import { canBootstrapOwner } from '@/lib/auth/admin-ids'
import { roleLabel } from '@/lib/admin-format'
import { BootstrapOwner } from './bootstrap-owner'

export const dynamic = 'force-dynamic'

/**
 * Admin panel shell. Server-side gate: only users with an `admin_roles` row
 * (owner/admin/moderator/support) get in. Everyone else sees a denial notice.
 * No new auth — reuses the existing JWT session cookie. Styled with the site's
 * glass + violet design language.
 *
 * First-run bootstrap: if the visitor is logged in, has no admin role yet, but
 * is listed in ADMIN_IDS AND `admin_roles` is still empty, we offer a one-time
 * "become owner" button.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    const base = await getSession()
    const mayBootstrap = base ? await canBootstrapOwner(base.uid) : false

    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="glass rounded-3xl border border-border p-8 text-center">
          <div className="mb-3 text-4xl">🛡</div>
          <h1 className="text-2xl font-bold text-foreground">Админка</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Доступ только для администраторов. Войди через Telegram аккаунтом с
            назначенной ролью (владелец / админ / модератор / саппорт).
          </p>
          {mayBootstrap && (
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-left">
              <p className="text-sm text-foreground">
                Ролей ещё нет, а твой аккаунт в списке ADMIN_IDS. Можно назначить
                себя первым владельцем — это разовое действие.
              </p>
              <div className="mt-3">
                <BootstrapOwner />
              </div>
            </div>
          )}
          <div className="mt-6">
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              ← На главную
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Live sections + foundation placeholders (shown disabled until they ship).
  const nav: { href: string; label: string; emoji: string }[] = [
    { href: '/admin', label: 'Дашборд', emoji: '📊' },
    { href: '/admin/economy', label: 'Экономика', emoji: '💹' },
    { href: '/admin/season', label: 'Сезон', emoji: '🏆' },
    { href: '/admin/cases', label: 'Кейсы', emoji: '🎁' },

    { href: '/admin/items', label: 'Предметы', emoji: '🧩' },
    { href: '/admin/collections', label: 'Коллекции', emoji: '📚' },
    { href: '/admin/assets', label: 'Арт', emoji: '🎨' },
    { href: '/admin/featured', label: 'Избранное', emoji: '⭐' },

    { href: '/admin/gifts', label: 'Подарки', emoji: '🎀' },
    { href: '/admin/shop', label: 'Магазин', emoji: '🛒' },
    { href: '/admin/deliveries', label: 'Доставки', emoji: '📦' },
    { href: '/admin/settings', label: 'Настройки', emoji: '⚙️' },

    { href: '/admin/audit', label: 'Аудит', emoji: '📜' },
  ]
  const soon: { label: string; emoji: string }[] = [
    { label: 'Роли', emoji: '🔑' },
  ]



  return (
    <div className="mx-auto max-w-4xl px-4 pt-header pb-10">
      {/* Top bar */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <nav className="flex flex-wrap items-center gap-1.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/[0.08] sm:text-sm"
            >
              {item.emoji} {item.label}
            </Link>
          ))}
          {soon.map((item) => (
            <span
              key={item.label}
              title="Скоро"
              className="cursor-default rounded-full border border-border/60 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-muted-foreground/60 sm:text-sm"
            >
              {item.emoji} {item.label}
            </span>
          ))}
        </nav>
        <span className="shrink-0 self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:self-auto">
          {roleLabel(session.role)}
        </span>

      </header>

      {children}
    </div>
  )
}
