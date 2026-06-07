import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Canonical live route is `/live` — the full "Живая статистика" center:
 * community stats, top-rich, weekly-top, MESSAGES panel, FAMILIES top, economy,
 * achievements catalog, TITLES ladder, daily panel, bot features, commands
 * explorer (with #titles/#families/#top-rich anchors used across the site).
 *
 * The earlier `/live-v2` was a parallel rebuild that DROPPED families ranking,
 * messages, titles ladder, daily, commands explorer. Per the product audit we
 * converge on the richer page and keep one clear system. This redirect preserves
 * existing `/live-v2` links.
 */
export default function LiveV2Redirect() {
  redirect('/live')
}
