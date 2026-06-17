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

  // Grouped, ranked navigation. COCKPIT = the owner's daily "run the project"
  // surfaces; MANAGE = content/operations; SYSTEM = configuration/history.
  // Infrastructure routes (items/collections/assets/featured) stay reachable by
  // URL + in-context pickers but are intentionally OUT of the primary nav so
  // they don't compete with the main operator jobs.
  type NavItem = { href: string; label: string; emoji: string }
  const groups: { id: string; label: string; items: NavItem[] }[] = [
    {
      id: 'cockpit',
      label: 'Центр',
      items: [
        { href: '/admin', label: 'Пульс', emoji: '📡' },
        { href: '/admin/players', label: 'Игроки', emoji: '👥' },
        { href: '/admin/operations', label: 'Управление', emoji: '⚙️' },
        { href: '/admin/economy', label: 'Экономика', emoji: '💹' },
      ],
    },
    {
      id: 'manage',
      label: 'Контент',
      items: [
        { href: '/admin/cases', label: 'Кейсы', emoji: '🎁' },
        { href: '/admin/gifts', label: 'Подарки', emoji: '🎀' },
        { href: '/admin/shop', label: 'Магазин', emoji: '🛒' },
        { href: '/admin/season', label: 'Сезон', emoji: '🏆' },
      ],
    },
    {
      id: 'system',
      label: 'Система',
      items: [
        { href: '/admin/settings', label: 'Настройки', emoji: '🎛️' },
        { href: '/admin/ai', label: 'Друн', emoji: '🜏' },
        { href: '/admin/audit', label: 'Аудит', emoji: '📜' },
      ],
    },
  ]
  const soon: { label: string; emoji: string }[] = [{ label: 'Роли', emoji: '🔑' }]

  return (
    <div className="mx-auto max-w-4xl px-4 pt-header pb-10">
      {/* Top bar */}
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold tracking-tight text-foreground">
            VOZNYA <span className="text-muted-foreground">OS</span>
          </span>
          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            {roleLabel(session.role)}
          </span>
        </div>

        <nav className="flex flex-col gap-2">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-full text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 sm:w-auto">
                {g.label}
              </span>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    g.id === 'cockpit'
                      ? 'border-primary/30 bg-primary/[0.08] text-foreground hover:border-primary/50 hover:bg-primary/[0.14]'
                      : 'border-border bg-white/[0.04] text-foreground hover:border-primary/40 hover:bg-primary/[0.08]'
                  }`}
                >
                  {item.emoji} {item.label}
                </Link>
              ))}
              {g.id === 'system' &&
                soon.map((item) => (
                  <span
                    key={item.label}
                    title="Скоро"
                    className="cursor-default rounded-full border border-border/60 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-muted-foreground/60 sm:text-sm"
                  >
                    {item.emoji} {item.label}
                  </span>
                ))}
            </div>
          ))}
        </nav>
      </header>

      {children}
    </div>
  )
}
