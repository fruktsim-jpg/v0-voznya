import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { AdminPageHeader } from '@/components/admin/ui'
import { AiManager, type AiPrompt, type AiSettingRow } from './ai-manager'

export const dynamic = 'force-dynamic'

/**
 * AI (Тёмный друн) admin page. Owner-only (ROLES_MANAGE): this controls the
 * provider API key, model, prompts and live narrator behaviour. Edits the same
 * `ai_settings` / `ai_prompts` tables the bot reads (no deploy needed).
 *
 * Degrades gracefully: if migration 0045 is not applied yet the lists are empty
 * and the bot keeps the Drun disabled.
 */
const MASKED = '••••••••'

export default async function AdminAiPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Раздел ИИ доступен только владельцу: он управляет ключом и голосом Друна.
      </div>
    )
  }

  let settings: AiSettingRow[] = []
  let prompts: AiPrompt[] = []
  try {
    const rows = await query<{ key: string; value: unknown; updated_at: string }>(
      `SELECT key, value, updated_at FROM ai_settings ORDER BY key`,
    )
    settings = rows.map((r) =>
      r.key === 'api_key' || r.key === 'image_api_key'
        ? { ...r, value: r.value ? MASKED : '' }
        : r,
    )
    prompts = await query<AiPrompt>(
      `SELECT name, body, description, enabled, updated_at
         FROM ai_prompts ORDER BY name`,
    )
  } catch {
    settings = []
    prompts = []
  }

  return (
    <div>
      <AdminPageHeader
        title="Тёмный друн"
        subtitle="ИИ-нарратор мира Возни. Провайдер (OpenAI/OpenRouter/Claude), модель, промпты и память — всё правится здесь без деплоя. Бот подхватывает изменения за ~30 секунд."
      />
      <AiManager initialSettings={settings} initialPrompts={prompts} />
    </div>
  )
}
