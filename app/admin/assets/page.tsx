import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { AssetsManager, type AdminAsset } from './assets-manager'

export const dynamic = 'force-dynamic'

/**
 * Item Authoring — Asset Studio (IA-1).
 *
 * The first content-authoring surface: upload PNG/WebP art for an item code,
 * preview it through the REAL <ItemArt> capsule, and publish it so it lights up
 * across every surface (cases, shop, inventory, feed, profile…) with no code
 * change. Gates on content.view; upload needs content.manage; publish needs
 * content.publish. All writes go through /api/admin/assets (audited, Pattern A).
 */
export default async function AdminAssetsPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.CONTENT_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра контента.
      </div>
    )
  }

  const canManage = hasPermission(session.role, PERM.CONTENT_MANAGE)
  const canPublish = hasPermission(session.role, PERM.CONTENT_PUBLISH)

  let assets: AdminAsset[] = []
  try {
    assets = await query<AdminAsset>(
      `SELECT code, mime, width, height, byte_size::int AS byte_size,
              status, version, updated_at
         FROM item_assets
        ORDER BY updated_at DESC`,
    )
  } catch {
    assets = []
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Арт предметов</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Загрузи PNG или WebP, привяжи к коду предмета, проверь через реальную
        карточку и опубликуй. Опубликованный арт сразу появляется везде — в
        кейсах, магазине, инвентаре, ленте и профиле. Без кода и деплоя.
      </p>
      <AssetsManager
        initialAssets={assets}
        canManage={canManage}
        canPublish={canPublish}
      />
    </div>
  )
}
