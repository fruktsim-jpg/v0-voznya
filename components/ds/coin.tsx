/**
 * VOZNYA Currency Identity (PHASE B — B3): the ешка coin.
 *
 * The platform's economy ran on the egg emoji — OS-rendered, brand-anonymous,
 * inconsistent across devices. B3 replaces it with a MINTED coin: an owned SVG
 * struck like real currency (rim, bevel, relief glyph, sheen) so balances,
 * rewards, drops and leaderboards all read as the same money.
 *
 * `VoznyaCoin` = the asset (sizes by `1em` so it sits inline with type).
 * `CoinAmount` = the canonical money lozenge (coin + economy-typed number),
 *               the single reusable unit across economy/balances/leaderboards/
 *               drops/admin. See currency-display.tsx for the header treatment.
 *
 * Pure presentation. SSR-safe. Tone is gold by default; `tone="muted"` for
 * secondary contexts, `tone="inherit"` to take the surrounding text color.
 */
import { cn } from '@/lib/utils'

type CoinTone = 'gold' | 'muted' | 'inherit'

const TONE: Record<CoinTone, { face: string; face2: string; rim: string; relief: string }> = {
  // struck gold — the real ешка
  gold: { face: '#FFD86B', face2: '#E0961B', rim: '#B97606', relief: '#7A4E08' },
  // desaturated for dense/secondary UI
  muted: { face: '#C9A84C', face2: '#9C7C2E', rim: '#6E561E', relief: '#4A3A14' },
  // monochrome, follows text color via currentColor
  inherit: { face: 'currentColor', face2: 'currentColor', rim: 'currentColor', relief: 'currentColor' },
}

/**
 * The minted coin. The relief glyph is a stylized "B" (Возня → В) struck into the
 * face — the seed of the brand mark, readable even at 16px.
 */
export function VoznyaCoin({
  size = '1em',
  tone = 'gold',
  className,
  title,
}: {
  size?: string
  tone?: CoinTone
  className?: string
  title?: string
}) {
  const c = TONE[tone]
  const mono = tone === 'inherit'
  // Unique gradient ids would be ideal per-instance, but a shared id is fine here
  // because the stops are identical for a given tone and SVG defs de-dupe visually.
  const gid = `vc-${tone}`
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn('inline-block shrink-0 align-[-0.125em]', className)}
    >
      {title ? <title>{title}</title> : null}
      {!mono && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.face} />
            <stop offset="1" stopColor={c.face2} />
          </linearGradient>
        </defs>
      )}
      {/* rim */}
      <circle cx="12" cy="12" r="10.5" fill={mono ? 'none' : c.rim} stroke={c.rim} strokeWidth={mono ? 1.6 : 0} opacity={mono ? 0.9 : 1} />
      {/* face */}
      <circle cx="12" cy="12" r="9" fill={mono ? 'none' : `url(#${gid})`} stroke={mono ? c.face : c.rim} strokeWidth={mono ? 1.2 : 0.5} opacity={mono ? 0.5 : 1} />
      {/* inner relief ring */}
      <circle cx="12" cy="12" r="7" fill="none" stroke={c.relief} strokeWidth="0.7" opacity={mono ? 0.4 : 0.55} />
      {/* struck "В" relief glyph */}
      <path
        d="M9.3 7.5h3.4c1.5 0 2.5.8 2.5 2.1 0 .9-.5 1.6-1.3 1.9 1 .25 1.7 1 1.7 2.1 0 1.5-1.1 2.4-2.8 2.4H9.3zM11 9.1v2h1.4c.7 0 1.2-.4 1.2-1s-.5-1-1.2-1zm0 3.5v2.2h1.6c.8 0 1.3-.45 1.3-1.1s-.5-1.1-1.3-1.1z"
        fill={mono ? c.face : c.relief}
        opacity={mono ? 0.9 : 0.85}
      />
      {/* sheen */}
      {!mono && (
        <path d="M6 7.5c1.5-2 4-3.2 6.5-3.1-2 .6-3.8 1.9-4.9 3.7-.7 1.1-1.6 1-1.6-.6z" fill="#fff" opacity="0.30" />
      )}
    </svg>
  )
}

/**
 * CoinAmount — the canonical money unit. Coin + economy-typed number, optional
 * label. Use everywhere a ешка value is shown so the currency reads identically.
 */
export function CoinAmount({
  value,
  tone = 'gold',
  size = 'md',
  coinClassName,
  className,
  'aria-label': ariaLabel,
}: {
  value: number | string
  tone?: CoinTone
  size?: 'xs' | 'sm' | 'md' | 'lg'
  coinClassName?: string
  className?: string
  'aria-label'?: string
}) {
  const text = typeof value === 'number' ? value.toLocaleString('ru-RU') : value
  const sizeClass = {
    xs: 'text-[11px] gap-0.5',
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5',
  }[size]
  return (
    <span
      className={cn('inline-flex items-center', sizeClass, className)}
      aria-label={ariaLabel ?? `${text} ешек`}
    >
      <VoznyaCoin tone={tone} className={coinClassName} />
      <span className="type-economy">{text}</span>
    </span>
  )
}
