import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getAdminSession } from '@/lib/auth/admin-session'
import { getIdentityProgression } from '@/lib/identity'
import { ScreenHeader } from '@/components/v2/screen-header'
import { Glyph, type GlyphName } from '@/components/ds/icon'
import { LogoutButton } from '@/components/auth/logout-button'
import { FxSettings } from '@/components/settings/fx-settings'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Аккаунт — ВОЗНЯ',
  description: 'Твой аккаунт в Возне: профиль, статус, предпочтения.',
}

/**
 * Account Center (E0.3 — `/settings`)
 * ===================================
 * NOT a SaaS settings page. This is the player's permanent **account home** —
 * a destination that grows over time, where future user preferences (sound,
 * animations, notifications, privacy, premium, referral) will live so we never
 * have to invent another random destination later.
 *
 * Honesty rules (carried from the platform context):
 *   - The bot owns the `users` table. The site reads it. So we show real
 *     identity/status and NO fake toggles — preferences that aren't wired yet
 *     are shown as honest "скоро" / "управляется в боте" slots, not dead
 *     checkboxes pretending to work.
 *   - No balance/#rank restatement (shell pills own those). Status here is
 *     identity: MMR rank, division, registration state.
 *
 * Server component: reads the SIGNED session + read-only identity slice.
 */

type PrefState = 'soon' | 'bot'

function PrefRow({
  icon,
  title,
  desc,
  state,
}: {
  icon: GlyphName
  title: string
  desc: string
  state: PrefState
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-white/[0.02] p-3.5 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-muted-foreground">
        <Glyph name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-[12px] text-muted-foreground">{desc}</p>
      </div>
      <span
        className={
          state === 'soon'
            ? 'shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary'
            : 'shrink-0 rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200'
        }
      >
        {state === 'soon' ? 'Скоро' : 'В боте'}
      </span>
    </div>
  )
}

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/?auth=required')
  }

  const [identity, adminSession] = await Promise.all([
    getIdentityProgression(session.uid).catch(() => null),
    getAdminSession().catch(() => null),
  ])

  const displayName =
    identity?.name?.trim() || session.firstName?.trim() || session.username?.trim() || 'Игрок'
  const initial = displayName.replace(/^@/, '').charAt(0).toUpperCase() || 'И'
  const photoUrl = identity?.photoUrl ?? null
  const registered = identity?.registered ?? false
  const isAdmin = !!adminSession
  const statusBits = [identity?.mmrRank?.name, identity?.season?.division.name].filter(
    Boolean,
  ) as string[]

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon="settings" title="Аккаунт" kicker="Профиль · статус · предпочтения" accent="indigo" />

      <div className="mx-auto max-w-2xl px-4 pb-28 sm:px-6">
        {/* Identity card — who I am in Возне (status, not metrics). */}
        <section className="glass relative overflow-hidden rounded-3xl border border-border p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/15"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground ring-1 ring-white/10">
                {initial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">{displayName}</h1>
              {session.username && (
                <p className="truncate text-sm text-muted-foreground">@{session.username}</p>
              )}
              <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                {identity?.mmrRank?.emoji && <span aria-hidden="true">{identity.mmrRank.emoji}</span>}
                {statusBits.length > 0 ? statusBits.join(' · ') : 'Игрок Возни'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/profile/${session.uid}`}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-primary/25"
            >
              <Glyph name="profile" className="h-4 w-4" /> Мой профиль
            </Link>
            <Link
              href="/season"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              <Glyph name="season" className="h-4 w-4 text-muted-foreground" /> Сезон
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/20"
              >
                <Glyph name="shield" className="h-4 w-4" /> Командный центр
              </Link>
            )}
          </div>
        </section>

        {/* Account status — honest registration state. */}
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Статус аккаунта
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="rounded-2xl border border-border bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Glyph name={registered ? 'check' : 'lock'} className="h-3.5 w-3.5" /> Регистрация
              </div>
              <p className="mt-1.5 text-sm font-bold text-foreground">
                {registered ? 'Активен' : 'Гость'}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {registered ? 'Ты играешь в Возне' : 'Сыграй в боте, чтобы открыть профиль'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Glyph name="sparkles" className="h-3.5 w-3.5" /> Premium
              </div>
              <p className="mt-1.5 text-sm font-bold text-foreground">Скоро</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Статусы и бонусы в разработке</p>
            </div>
          </div>
        </section>

        {/* Preferences — future home for user settings. Honest slots only. */}
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Предпочтения
          </h2>
          <div className="space-y-2.5">
            <PrefRow
              icon="bell"
              title="Уведомления"
              desc="События, выигрыши, сезонные награды"
              state="soon"
            />
            <FxSettings />
            <PrefRow
              icon="eye"
              title="Приватность"
              desc="Видимость профиля и активности"
              state="soon"
            />
            <PrefRow
              icon="gift"
              title="Рефералы"
              desc="Приглашай друзей в Возню"
              state="soon"
            />
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-2xl border border-border bg-white/[0.02] px-3.5 py-3 text-[12px] text-muted-foreground">
            <Glyph name="bolt" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Часть настроек пока управляется через бота. Здесь они появятся по мере выхода —
            это твой постоянный раздел аккаунта.
          </p>
        </section>

        {/* Session */}
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Сессия
          </h2>
          <LogoutButton />
        </section>
      </div>
    </main>
  )
}
