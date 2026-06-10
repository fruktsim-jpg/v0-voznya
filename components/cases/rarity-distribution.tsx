import { rarityToken, type Rarity } from '@/lib/rarity'
import { chanceLabel, type RaritySlice } from '@/lib/cases-ux'

/**
 * RarityDistribution (Stage 3) — the "rarity profile" of a case at a glance.
 * A single stacked bar where each segment's WIDTH is its summed drop chance and
 * its COLOR is the tier. Lets a player read a case's value profile instantly
 * (lots of grey = filler case; a sliver of gold = a chase case) without parsing
 * a table.
 *
 * Server component, presentation only — `slices` are derived in lib/cases-ux
 * (CaseView.rarityDistribution). No data fetching, no RNG.
 */
export function RarityDistribution({
  slices,
  showLegend = false,
  height = 8,
  className = '',
}: {
  slices: RaritySlice[]
  showLegend?: boolean
  height?: number
  className?: string
}) {
  if (slices.length === 0) return null
  const total = slices.reduce((s, x) => s + x.chance, 0) || 1

  return (
    <div className={className}>
      <div
        className="flex w-full overflow-hidden rounded-full"
        style={{ height, background: 'rgba(255,255,255,0.06)' }}
        role="img"
        aria-label={
          'Распределение редкостей: ' +
          slices.map((s) => `${rarityToken(s.rarity).label} ${chanceLabel(s.chance)}`).join(', ')
        }
      >
        {slices.map((s) => {
          const t = rarityToken(s.rarity)
          const pct = (s.chance / total) * 100
          if (pct <= 0) return null
          return (
            <span
              key={s.rarity}
              className="h-full"
              style={{
                width: `${pct}%`,
                background: t.color,
                boxShadow: s.rarity !== 'common' ? `inset 0 0 8px ${t.color}` : undefined,
              }}
            />
          )
        })}
      </div>

      {showLegend && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {slices.map((s) => {
            const t = rarityToken(s.rarity)
            return (
              <li key={s.rarity} className="flex items-center gap-1.5 text-[11px]">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ background: t.color }}
                />
                <span style={{ color: t.color }}>{t.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {chanceLabel(s.chance)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Compact rarity dots (no widths) — for dense tiles where a full bar is too tall. */
export function RarityDots({ rarities }: { rarities: Rarity[] }) {
  // De-dup but keep order (already sorted rare→common by caller).
  const seen = new Set<Rarity>()
  const unique = rarities.filter((r) => (seen.has(r) ? false : (seen.add(r), true)))
  return (
    <div className="flex items-center gap-1">
      {unique.map((r) => {
        const t = rarityToken(r)
        return (
          <span
            key={r}
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: t.color, boxShadow: r !== 'common' ? t.glow || undefined : undefined }}
          />
        )
      })}
    </div>
  )
}
