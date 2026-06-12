import { redirect } from 'next/navigation'

/**
 * /shop — canonical alias for the Shop. The nav already treats /gifts and /shop
 * as the same destination; this makes the friendlier URL resolve instead of
 * 404ing. The implementation lives at /gifts (gift_catalog-backed).
 */
export default function ShopAlias() {
  redirect('/gifts')
}
