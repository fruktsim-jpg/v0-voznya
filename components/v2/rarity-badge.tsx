import { rarityToken, type Rarity } from '@/lib/rarity'

/**
 * Единый бейдж редкости (кейсы/подарки/достижения/события).
 * Server component.
 */
export function RarityBadge({
  rarity,
  className = '',
}: {
  rarity: Rarity
  className?: string
}) {
  const t = rarityToken(rarity)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${t.borderClass} ${t.textClass} ${className}`}
      style={{ boxShadow: t.glow || undefined }}
    >
      {t.label}
    </span>
  )
}
