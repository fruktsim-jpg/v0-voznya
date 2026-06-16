'use client'

/**
 * CelebrationOverlay (A3) — the full-screen MOMENT.
 *
 * Renders a tiered celebration: dimmed backdrop → hero medallion that rises and
 * overshoots → rarity glow + prestige sweep (epic+) → CSS shard burst (rare+) →
 * title/subtitle → optional shareable card affordance. Reuses the proven case
 * motion classes (.ds-celebrate-in, .case-shard, .ds-prestige-sweep) so a
 * celebration FEELS like the case reveal, everywhere.
 *
 * Particles are pure CSS (transform/opacity), NO new dependency, reduced-motion
 * safe. Skippable (tap backdrop / close). Presentation only.
 */

import { useEffect, useState } from 'react'
import { rarityToken } from '@/lib/rarity'
import {
  celebrationRarity,
  isBigMoment,
  shardCount,
  type Celebration,
} from '@/lib/celebration'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { shareWin } from '@/lib/share'
import { Glyph } from '@/components/ds/icon'

const KIND_LABEL: Record<Celebration['kind'], string> = {
  drop: 'Награда',
  achievement: 'Достижение',
  rankup: 'Новый ранг',
  division: 'Новый дивизион',
  season: 'Сезон',
  collection: 'Коллекция',
  purchase: 'Покупка',
}

function buildShards(n: number, color: string) {
  return Array.from({ length: n }).map((_, i) => {
    const angle = (360 / n) * i + (i % 2 ? 12 : 0)
    const dist = 80 + (i % 3) * 28
    return {
      key: i,
      dx: Math.cos((angle * Math.PI) / 180) * dist,
      dy: Math.sin((angle * Math.PI) / 180) * dist,
      rot: (i % 2 ? 1 : -1) * (160 + (i % 4) * 40),
      delay: (i % 5) * 45,
      color: i % 3 === 0 ? '#fff' : color,
    }
  })
}

export function CelebrationOverlay({
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
  const big = isBigMoment(c.tier)
  const shards = !reduced ? buildShards(shardCount(c.tier), t.color) : []

  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'copied' | 'shared' | 'failed'>('idle')

  async function onShare() {
    if (shareState === 'sharing') return
    setShareState('sharing')
    const payload = c.share ?? { title: c.title, special: big }
    const res = await shareWin(payload)
    if (res === 'copied') setShareState('copied')
    else if (res === 'shared') setShareState('shared')
    else if (res === 'unavailable') setShareState('failed')
    else setShareState('idle')
  }

  // Auto-dismiss after a beat so the moment doesn't block forever; big moments
  // linger a little longer. Tap anywhere still dismisses immediately. We hold
  // the timer while a share is in flight so the sheet/clipboard isn't cut off.
  useEffect(() => {
    if (shareState === 'sharing') return
    const ms = big ? 5200 : 3600
    const id = window.setTimeout(onDismiss, ms)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big, onDismiss, shareState])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${KIND_LABEL[c.kind]}: ${c.title}`}
      onClick={onDismiss}
    >
      {/* Backdrop — dims the world so the moment is the focus. */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm ${reduced ? '' : 'ds-celebrate-backdrop'}`}
      />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border p-6 text-center ${reduced ? '' : 'ds-celebrate-in'}`}
        style={{
          borderColor: t.color,
          background: `radial-gradient(circle at 50% 0%, ${t.color}22, rgba(12,12,16,0.96) 70%)`,
          boxShadow: big ? t.glow || undefined : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prestige conic sweep (epic+) */}
        {big && !reduced && (
          <span
            aria-hidden="true"
            className="ds-prestige-sweep pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-2xl"
            style={{ background: `conic-gradient(from 0deg, transparent, ${t.color}, transparent 55%)` }}
          />
        )}

        {/* Top accent line */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }}
        />

        {/* Eyebrow */}
        <p
          className="relative z-10 text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: t.color }}
        >
          {KIND_LABEL[c.kind]}
        </p>

        {/* Hero medallion + shard burst */}
        <div className="relative z-10 mx-auto mt-4 flex h-28 w-28 items-center justify-center">
          {big && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -inset-3 rounded-full blur-2xl ${reduced ? 'opacity-40' : 'case-glow-pulse'}`}
              style={{ background: t.color }}
            />
          )}
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-full border text-5xl"
            style={{ borderColor: t.color, background: t.capsule }}
          >
            {c.art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.art} alt="" loading="lazy" decoding="async" className="h-16 w-16 object-contain" />
            ) : (
              <span aria-hidden="true">{c.glyph ?? '🎉'}</span>
            )}
          </div>

          {shards.length > 0 && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
              {shards.map((s) => (
                <span
                  key={s.key}
                  className="case-shard absolute h-2 w-1.5 rounded-full"
                  style={
                    {
                      left: 0,
                      top: 0,
                      background: s.color,
                      '--dx': `${s.dx}px`,
                      '--dy': `${s.dy}px`,
                      '--rot': `${s.rot}deg`,
                      animationDelay: `${s.delay}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </span>
          )}
        </div>

        <h2 className="relative z-10 mt-4 text-2xl font-extrabold leading-tight" style={{ color: t.color }}>
          {c.title}
        </h2>
        {c.subtitle && (
          <p className="relative z-10 mt-1 text-sm text-foreground/80">{c.subtitle}</p>
        )}
        {c.flavor && (
          <p className="relative z-10 mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            {c.flavor}
          </p>
        )}

        {/* Actions */}
        <div className="relative z-10 mt-5 flex items-center justify-center gap-2">
          {c.shareable && (
            <button
              type="button"
              onClick={onShare}
              disabled={shareState === 'sharing'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-foreground transition hover:bg-white/10 active:scale-[0.97] disabled:opacity-60"
            >
              <Glyph name={shareState === 'copied' ? 'check' : 'share'} className="h-4 w-4" />
              {shareState === 'copied'
                ? 'Скопировано'
                : shareState === 'shared'
                  ? 'Отправлено'
                  : shareState === 'sharing'
                    ? '…'
                    : shareState === 'failed'
                      ? 'Не удалось'
                      : 'Поделиться'}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border px-4 py-2 text-sm font-bold transition active:scale-[0.97]"
            style={{ borderColor: `${t.color}80`, color: t.color, background: `${t.color}1a` }}
          >
            Отлично
          </button>
        </div>
      </div>
    </div>
  )
}
