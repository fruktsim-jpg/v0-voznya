/**
 * Admin role permissions — TypeScript mirror of the bot's
 * `app/core/permissions.py`. Keep the two in sync: same roles, same
 * permission strings, same inheritance. The bot enforces this for its admin
 * commands; the site enforces the identical rules for the admin panel.
 *
 * Roles (descending power): owner > admin > moderator > support.
 */

export type AdminRole = 'owner' | 'admin' | 'moderator' | 'support'

export const ADMIN_ROLES: readonly AdminRole[] = [
  'owner',
  'admin',
  'moderator',
  'support',
]

// Permission catalog ("<domain>.<action>").
export const PERM = {
  DASHBOARD_VIEW: 'dashboard.view',
  PLAYERS_VIEW: 'players.view',
  PLAYERS_EDIT: 'players.edit',
  ECONOMY_VIEW: 'economy.view',
  ECONOMY_ADD: 'economy.add',
  ECONOMY_REMOVE: 'economy.remove',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_GRANT: 'inventory.grant',
  INVENTORY_REVOKE: 'inventory.revoke',
  SHOP_VIEW: 'shop.view',
  SHOP_MANAGE: 'shop.manage',
  LOGS_VIEW: 'logs.view',
  MODERATION_VIEW: 'moderation.view',
  MODERATION_BAN: 'moderation.ban',
  ROLES_MANAGE: 'roles.manage',
  GIFT_VIEW: 'gift.view',
  GIFT_MANAGE: 'gift.manage',
} as const

export type Permission = (typeof PERM)[keyof typeof PERM]

const SUPPORT: ReadonlySet<string> = new Set([
  PERM.DASHBOARD_VIEW,
  PERM.PLAYERS_VIEW,
  PERM.ECONOMY_VIEW,
  PERM.INVENTORY_VIEW,
  PERM.SHOP_VIEW,
  PERM.MODERATION_VIEW,
  PERM.GIFT_VIEW,
])

const MODERATOR: ReadonlySet<string> = new Set([
  ...SUPPORT,
  PERM.MODERATION_BAN,
  PERM.LOGS_VIEW,
  PERM.PLAYERS_EDIT,
])

const ADMIN: ReadonlySet<string> = new Set([
  ...MODERATOR,
  PERM.ECONOMY_ADD,
  PERM.ECONOMY_REMOVE,
  PERM.INVENTORY_GRANT,
  PERM.INVENTORY_REVOKE,
  PERM.SHOP_MANAGE,
  PERM.GIFT_MANAGE,
])

const OWNER: ReadonlySet<string> = new Set([...ADMIN, PERM.ROLES_MANAGE])

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<string>> = {
  support: SUPPORT,
  moderator: MODERATOR,
  admin: ADMIN,
  owner: OWNER,
}

export const ROLE_RANK: Record<AdminRole, number> = {
  support: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
}

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return !!value && (ADMIN_ROLES as readonly string[]).includes(value)
}

export function rolePermissions(role: string | null | undefined): ReadonlySet<string> {
  if (!isAdminRole(role)) return new Set()
  return ROLE_PERMISSIONS[role]
}

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  return rolePermissions(role).has(permission)
}
