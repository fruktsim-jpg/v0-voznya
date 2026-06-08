import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Canonical delivery-center URL (Admin V2 P0). The implementation lives under
 * /admin/gifts/deliveries; this is the short, discoverable alias the operator
 * asked for. Single source of truth — no duplicated logic, just a redirect.
 */
export default function AdminDeliveriesAlias() {
  redirect('/admin/gifts/deliveries')
}
