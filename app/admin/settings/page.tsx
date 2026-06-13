import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import type { AdminSetting } from './settings-manager'
import { HumanSettings } from './human-settings'

export const dynamic = 'force-dynamic'

/**
 * App settings admin page (Admin V2, Stage 9). Server component: gates on
 * economy.view to read, passes a canManage flag (owner-only) for edits. Edits
 * the SAME `app_settings` table the bot reads via `app.settings.dynamic` — no
 * code change or migration needed to retune prices/weights/chances/cooldowns.
 *
 * Degrades gracefully: if migration 0032 is not applied yet the list is empty
 * and the bot keeps using code defaults.
 */
export default async function AdminSettingsPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра настроек.
      </div>
    )
  }

  const canManage = hasPermission(session.role, PERM.ROLES_MANAGE)

  let settings: AdminSetting[] = []
  try {
    settings = await query<AdminSetting>(
      `SELECT key, value, category, description,
              updated_by::text AS updated_by, updated_at
         FROM app_settings
        ORDER BY category, key`,
    )
  } catch {
    settings = []
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Настройки</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Человеческие параметры экономики и игр — без кодов и JSON. Бот
        подхватывает изменения в течение ~60 секунд; «live» применяется сразу,
        «готово» — когда бот начнёт читать ключ. Сброс возвращает значение из кода.
      </p>
      <HumanSettings initialSettings={settings} canManage={canManage} />
    </div>
  )
}
