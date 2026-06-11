'use client'

/**
 * CelebrationMini (PHASE C — C5 Ceremony Expansion).
 *
 * The middle channel of the ceremony matrix (see lib/celebration.ceremonyChannel):
 * a compact, NON-BLOCKING corner card for mid-weight moments — epic drops,
 * rank-ups, season milestones, achievements. It honors the event with the rarity
 * edge, glyph medallion, and a short rise-in, but it does NOT dim the world or
 * trap focus the way the full overlay does. This is the anti-fatigue layer: "that
 * was good" without seizing the screen.
 *
 * Auto-dismisses on a short timer; tappable to dismiss early. Pinned bottom-center
 * above the nav so it never fights the full overlay (z below it) or the toast.
 * Pure CSS motion (reuses .ds-celebrate-in), reduced-motion safe. Presentation only.
 */

import { useEffect } from 'react'
import { rarityToken } from '@/lib/rarity'
import { celebrationRarity, type Celebration } from '@/lib/celebration'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const KIND_LABEL: Record<Celebration['kind'], string> = {
  drop: 'Награда',
  achievement: 'Достижение',
  rankup: 'Новый ранг',
  division: 'Новый дивизион',
  season: 'Сезон',
  collection: 'Коллекция',
  purchase: 'Покупка',
}

export function CelebrationMini({
  celebration,
  onDismiss,
}: {
  celebration: Celebration
  onDismiss: () => void
}) {
  const c = celebration
  const reduced = useReducedMotion()
  const rarity = celebrationRarity(c)
  const t = rarityToken(rarity)

  useEffect(() => {
    const id = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(id)
  }, [onDismiss])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[110] flex justify-center px-4 sm:bottom-6"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`${KIND_LABEL[c.kind]}: ${c.title}`}
        className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left backdrop-blur-md transition active:scale-[0.98] ${
          reduced ? '' : 'ds-celebrate-in'
        }`}
        style={{
          borderColor: `${t.color}66`,
          background: `linear-gradient(110deg, ${t.color}1f, rgba(14,14,18,0.94) 60%)`,
        }}
      >
        {/* Rarity edge */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: t.color }}
        />

        {/* Medallion */}
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-xl border text-2xl"
          style={{ borderColor: `${t.color}80`, background: t.capsule }}
        >
          {c.art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.art} alt="" className="size-7 object-contain" />
          ) : (
            <span>{c.glyph ?? '✦'}</span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className="block text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: t.color }}
          >
            {KIND_LABEL[c.kind]}
          </span>
          <span className="block truncate text-sm font-bold text-foreground">{c.title}</span>
          {c.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>
          )}
        </span>
      </button>
    </div>
  )
}
