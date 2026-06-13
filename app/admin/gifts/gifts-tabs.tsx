import Link from 'next/link'

/**
 * Gift sub-tabs: Каталог ↔ Доставки, both under /admin/gifts. Pure links
 * (server-rendered) so each tab loads only its own data. The deliveries tab
 * shows a live pending badge so the operator sees the queue without leaving.
 */
export function GiftsTabs({
  active,
  pendingCount,
}: {
  active: 'catalog' | 'deliveries'
  pendingCount: number | null
}) {
  const tabs = [
    { id: 'catalog', label: 'Каталог', emoji: '🎀', href: '/admin/gifts' },
    { id: 'deliveries', label: 'Доставки', emoji: '📦', href: '/admin/gifts?tab=deliveries' },
  ] as const

  return (
    <div className="mb-5 flex items-center gap-1.5 border-b border-border pb-px">
      {tabs.map((t) => {
        const on = active === t.id
        return (
          <Link
            key={t.id}
            href={t.href}
            className={`relative -mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-semibold transition ${
              on
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
            {t.id === 'deliveries' && pendingCount != null && pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                {pendingCount}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
