import { redirect } from 'next/navigation'

/**
 * Deliveries folded into the unified Gifts screen (?tab=deliveries). This route
 * is kept for back-compat / deep links and simply forwards there.
 */
export default function LegacyDeliveriesPage() {
  redirect('/admin/gifts?tab=deliveries')
}
