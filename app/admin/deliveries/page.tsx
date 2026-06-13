import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Canonical short alias for the delivery center, which now lives as a tab inside
 * the unified Gifts screen. Single source of truth — just a redirect.
 */
export default function AdminDeliveriesAlias() {
  redirect('/admin/gifts?tab=deliveries')
}
