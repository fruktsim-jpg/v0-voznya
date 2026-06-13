import Link from 'next/link'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { getActiveSeason } from '@/lib/season'
import { OPERATIONS_KEYS } from '@/lib/admin/operations-registry'
import { SeasonManager } from '../season/season-manager'
import { OperationsBoard } from './operations-board'

export const dynamic = 'force-dynamic'

/**
 * Operations Center — "how do I run VOZNYA?" (vs Player Studio's "how do I run a
 * player?"). One screen for the platform-wide levers that actually exist:
 *   • Season — real on/off (seasons.is_active), reuses the season control.
 *   • Services — global on/off flags (app_settings), honest enforced/armed.
 *   • Modifiers — global multipliers foundation (app_settings), armed.
 *
 * No new architecture: season uses the existing season actions; toggles/
 * modifiers are app_settings rows the bot reads via app.settings.dynamic.
 */
export default async function OperationsPage() {
  const session = await getAdminSession()
  if (!session) return null

  const canManageOps = hasPermission(session.role, PERM.ROLES_MANAGE)
  const canManageSeason = hasPermission(session.role, PERM.MMR_ADD)

  // Season state (real) + current operations flag values (degrade gracefully).
  const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p
    } catch {
      return fallback
    }
  }

  const active = await safe(getActiveSeason(), null)
  const opsRows = await safe(
    query<{ key: string; value: unknown }>(
      `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
      [OPERATIONS_KEYS],
    ),
    [] as { key: string; value: unknown }[],
  )
  const initialValues: Record<string, unknown> = {}
  for (const r of opsRows) initialValues[r.key] = r.value

  const seasonForManager = active
    ? {
        id: active.id,
        name: active.name,
        endsAt: active.endsAt,
        daysLeft: Math.max(
          0,
          Math.ceil((new Date(active.endsAt).getTime() - Date.now()) / 86_400_000),
        ),
      }
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
          ⚙️ Управление VOZNYA
        </h1>
        <p className="text-sm text-muted-foreground">
          Сезон, сервисы и глобальные модификаторы — без SQL и консоли.
        </p>
      </div>

      {/* Status strip — the success test: see state at a glance */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatusTile
          emoji="🏆"
          label="Сезон"
          ok={!!active}
          text={active ? active.name : 'не идёт'}
        />
        <StatusTile emoji="🎰" label="Казино" ok text="активно" />
        <StatusTile emoji="🎁" label="Кейсы" ok text="активны" />
        <StatusTile emoji="🛒" label="Магазин" ok text="активен" />
      </section>

      {/* Season — the one fully-real platform on/off lever today */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Сезон
        </h2>
        <SeasonManager active={seasonForManager} canManage={canManageSeason} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Полное управление сезоном и таблица дивизионов —{' '}
          <Link href="/admin/season" className="text-primary hover:underline">
            на странице Сезон →
          </Link>
        </p>
      </section>

      {/* Services + modifiers */}
      <OperationsBoard canManage={canManageOps} initialValues={initialValues} />
    </div>
  )
}

function StatusTile({
  emoji,
  label,
  ok,
  text,
}: {
  emoji: string
  label: string
  ok: boolean
  text: string
}) {
  return (
    <div className="glass rounded-2xl border border-border p-3.5">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={`text-sm font-bold ${ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
            {ok ? '🟢' : '🔴'} {text}
          </div>
        </div>
      </div>
    </div>
  )
}
