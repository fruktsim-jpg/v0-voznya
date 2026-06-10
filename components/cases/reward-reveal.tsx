'use client'

import { rarityToken } from '@/lib/rarity'
import type { WonReward } from '@/lib/case-open-ux'
import { isHighTier } from '@/lib/case-open-ux'
import { ItemArt } from '@/components/ds/item-art'
import { RarityBadge } from '@/components/v2/rarity-badge'

/**
 * RewardReveal (Stage 3) — THE moment. Communicates rarity instantly and makes
 * the reward feel earned. Layered, GPU-cheap presentation that SCALES with how
 * special the drop is:
 *   - common  → clean, calm capsule, no fanfare;
 *   - rare+   → tier glow pulse behind the art;
 *   - epic+   → + rotating conic sheen + prestige label;
 *   - jackpot / premium / mythic → + shard burst + "event" banner.
 *
 * Duplicate UX: when the player already owns this item, an "owned ×N" ribbon
 * makes ownership + quantity immediately legible (the brief's duplicate state).
 *
 * Presentation only — the reward is the server's real result. No RNG.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

// 12 shards, precomputed angles → declarative CSS burst (no rAF, no canvas).
const SHARDS = Array.from({ length: 12 }).map((_, i) => {
  const angle = (360 / 12) * i + (i % 2 ? 12 : 0)
  const dist = 64 + (i % 3) * 22
  return {
    dx: Math.cos((angle * Math.PI) / 180) * dist,
    dy: Math.sin((angle * Math.PI) / 180) * dist,
    rot: (i % 2 ? 1 : -1) * (160 + (i % 4) * 40),
    delay: (i % 4) * 40,
  }
})

export function RewardReveal({
  won,
  duplicate,
  ownedQty,
  reducedMotion,
}: {
  won: WonReward
  /** Player already owns this collectible (drives the duplicate ribbon). */
  duplicate?: boolean
  /** Owned quantity AFTER this drop (for the "×N" ribbon). */
  ownedQty?: number
  reducedMotion?: boolean
}) {
  const t = rarityToken(won.rarity)
  const special = won.isJackpot || won.isPremium || won.rarity === 'mythic'
  const prestige = special || isHighTier(won.rarity)
  const animate = !reducedMotion

  return (
    <div
      className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl border p-6 text-center ${animate ? 'case-reveal-in' : ''}`}
      style={{
        borderColor: t.color,
        boxShadow: prestige ? t.glow || undefined : undefined,
        background: `radial-gradient(circle at 50% 0%, ${t.color}26, transparent 72%)`,
      }}
    >
      {/* Prestige conic sheen (epic+) */}
      {prestige && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-2xl ${animate ? 'case-sheen-spin' : ''}`}
          style={{
            background: `conic-gradient(from 0deg, transparent, ${t.color}, transparent 55%)`,
          }}
        />
      )}

      {/* Top accent line */}
      {prestige && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }}
        />
      )}

      {/* Shard burst — only for the rarest moments */}
      {special && animate && (
        <span className="pointer-events-none absolute left-1/2 top-[42%] z-0" aria-hidden="true">
          {SHARDS.map((s, i) => (
            <span
              key={i}
              className="case-shard absolute h-2 w-1.5 rounded-full"
              style={
                {
                  left: 0,
                  top: 0,
                  background: i % 3 === 0 ? '#fff' : t.color,
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

      {/* Event banner */}
      {won.isJackpot && (
        <span className="relative z-10 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
          💎 Джекпот
        </span>
      )}
      {won.isPremium && !won.isJackpot && (
        <span
          className="relative z-10 text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: t.color }}
        >
          ⭐ Telegram Premium
        </span>
      )}

      {/* Hero art with breathing glow */}
      <div className="relative z-10 mt-1">
        {prestige && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-4 rounded-full blur-2xl ${animate ? 'case-glow-pulse' : 'opacity-40'}`}
            style={{ background: t.color }}
          />
        )}
        <ItemArt glyph={won.icon} rarity={won.rarity} size="xl" className="relative" />
        {/* Duplicate / quantity ribbon */}
        {(duplicate || (ownedQty && ownedQty > 1) || won.qty > 1) && (
          <span className="absolute -bottom-1 -right-1 z-10 rounded-full border border-white/20 bg-black/80 px-2 py-0.5 text-[11px] font-bold text-foreground backdrop-blur-sm">
            {won.qty > 1 ? `×${won.qty}` : duplicate ? 'дубль' : `×${ownedQty}`}
          </span>
        )}
      </div>

      <h3
        className="relative z-10 mt-1 text-2xl font-extrabold leading-tight"
        style={{ color: t.color }}
      >
        {won.title}
      </h3>

      <div className="relative z-10 flex items-center gap-1.5">
        <RarityBadge rarity={won.rarity} />
        {won.starCost != null && won.starCost > 0 && (
          <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
            {fmt(won.starCost)} ⭐
          </span>
        )}
      </div>

      {/* Duplicate explainer (owned status, prepares future sell/recycle/trade) */}
      {duplicate && (
        <p className="relative z-10 mt-0.5 text-[11px] text-muted-foreground">
          Уже в коллекции — теперь у тебя {ownedQty && ownedQty > 1 ? `${ownedQty} шт.` : 'дубль'}
        </p>
      )}

      {won.subtitle && !duplicate && (
        <p className="relative z-10 text-xs text-muted-foreground">{won.subtitle}</p>
      )}
    </div>
  )
}
