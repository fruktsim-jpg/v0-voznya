import Link from 'next/link'
import { getAdminSession } from '@/lib/auth/admin-session'
import { getSession } from '@/lib/auth/get-session'
import { canBootstrapOwner } from '@/lib/auth/admin-ids'
import { BootstrapOwner } from './bootstrap-owner'

export const dynamic = 'force-dynamic'

/**
 * Admin panel shell. Server-side gate: only users with an `admin_roles` row
 * (owner/admin/moderator/support) get in. Everyone else sees a denial notice.
 * No new auth — reuses the existing JWT session cookie.
 *
 * First-run bootstrap: if the visitor is logged in, has no admin role yet, but
 * is listed in ADMIN_IDS AND `admin_roles` is still empty, we offer a one-time
 * "become owner" button (see bootstrap-owner.tsx + /api/admin/bootstrap-owner).
 * This is the only way to get the very first owner without psql/docker.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    // No admin role. Check whether this logged-in visitor may bootstrap the
    // first owner (in ADMIN_IDS + admin_roles empty). Only then show the button.
    const base = await getSession()
    const mayBootstrap = base ? await canBootstrapOwner(base.uid) : false

    return (
      <div style={{ maxWidth: 640, margin: '80px auto', padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Админ-панель</h1>
        <p style={{ marginTop: 12, color: '#666' }}>
          Доступ только для администраторов. Войдите через Telegram аккаунтом с
          назначенной ролью (owner / admin / moderator / support).
        </p>
        {mayBootstrap && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: '#111', fontSize: 14 }}>
              Ролей ещё нет, а ваш аккаунт в списке ADMIN_IDS. Можно назначить
              себя первым владельцем — это разовое действие.
            </p>
            <BootstrapOwner />
          </div>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/" style={{ color: '#2563eb' }}>
            ← На главную
          </Link>
        </p>
      </div>
    )
  }

  const nav = [
    { href: '/admin', label: 'Дашборд' },
    { href: '/admin/players', label: 'Игроки' },
    { href: '/admin/audit', label: 'Аудит' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: 12,
          marginBottom: 24,
        }}
      >
        <nav style={{ display: 'flex', gap: 16 }}>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} style={{ color: '#111' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span style={{ fontSize: 13, color: '#666' }}>
          {session.uid} · <b>{session.role}</b>
        </span>
      </header>
      {children}
    </div>
  )
}
