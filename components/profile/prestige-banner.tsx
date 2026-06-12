import Link from 'next/link'
import { rarityToken, type Rarity } from '@/lib/rarity'
import { Glyph, type GlyphName } from '@/components/ds/icon'
import type { PrestigeSummary, Standing } from '@/lib/prestige-summary'

/**
 * PrestigeBanner (Phase D — Profile as a trophy case)
 * ===================================================
 * The profile's opening statement. Where the dense PlayerCard answers "what are
 * all my numbers", this answers the three questions a trophy case must answer
 * instantly: **where do I stand**, **what is the rarest thing I have**, and
 * **how far along am I**. It reframes raw stats as *standing* (E4 prestige) and
 * makes status something worn and shown (E7 social proof).
 *
 * Server component — pure presentation over the read-only PrestigeSummary.
 * Self-hides nothing destructively: with no standings and no crown jewel it
 * still renders mastery, so it degrades honestly. Owned `Glyph`s only, no emoji.
 */

const LADDER_GLYPH: Record<Standing['key'], GlyphName> = {
  mmr: 'bolt',
  wealth: 'coin',
  reputation: 'heart',
  voice: 'message',
}

const LADDER_HREF: Record<Standing['key'], string> = {
  mmr: '/live#top-rich',
  wealth: '/live#top-rich',
  reputation: '/live#top-rep',
  voice: '/live#top-messages',
}

function StandingPill({ s }: { s: Standing }) {
  return (
    <Link
      href={LADDER_HREF[s.key]}
      className="group/standing flex items-center gap-3 rounded-2xl border border-border bg-white/[0.03] px-3.5 py-2.5 transition hover:-translate-y-0.5 hover:border-primary/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Glyph name={LADDER_GLYPH[s.key]} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="type-stat text-lg leading-none text-foreground">
            {s.isFirst ? '№1' : `Топ ${s.topPercent}%`}
          </span>
          <span className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
            {s.label}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          #{s.rank} из {s.total.toLocaleString('ru-RU')}
        </span>
      </span>
    </Link>
  )
}

function CrownJewel({ jewel }: { jewel: NonNullable<PrestigeSummary['crownJewel']> }) {
  const t = rarityToken(jewel.rarity)
  const accent = jewel.rarity !== 'common'
  const jewelGlyph: GlyphName =
    jewel.kind === 'item' ? 'vault' : jewel.kind === 'title' ? 'crown' : 'trophy'

  return (
    <div
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 sm:flex-col sm:items-center sm:gap-3 sm:p-5 sm:text-center"
      style={{
        borderColor: accent ? t.color : undefined,
        boxShadow: accent ? t.glow || undefined : undefined,
      }}
    >
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: t.color }}
        />
      )}
      <span
        className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl"
        style={{ background: `radial-gradient(circle at 50% 35%, ${t.color}40, transparent 70%)`, color: t.color }}
      >
        <Glyph name={jewelGlyph} className="h-7 w-7" />
      </span>
      <div className="relative min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Главный трофей
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-foreground sm:text-base">
          {jewel.name}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: t.color }}>
          {t.label} · {jewel.note}
        </p>
      </div>
    </div>
  )
}

export function PrestigeBanner({
  summary,
  className = '',
  tier = null,
}: {
  summary: PrestigeSummary
  className?: string
  /**
   * E0.2 — тир-мир (по MMR-рангу) для окраски hero: Bronze ≠ Diamond с первого
   * взгляда. Чисто презентационный акцент поверх read-only summary; null —
   * нейтральная рамка (degrade honestly).
   */
  tier?: { color: string; gradient: string; glow: string; aura: string; index: number } | null
}) {
  const { standings, crownJewel, mastery, equippedTitle } = summary
  const achPct =
    mastery.achievementsTotal > 0
      ? Math.round((mastery.achievementsUnlocked / mastery.achievementsTotal) * 100)
      : 0

  // Nothing worth bragging about at all → don't render the trophy opener.
  const hasAnything =
    standings.length > 0 || crownJewel !== null || mastery.achievementsUnlocked > 0

  if (!hasAnything) return null

  return (
    <section
      aria-label="Престиж игрока"
      className={`glass relative overflow-hidden rounded-2xl border p-4 sm:rounded-3xl sm:p-6 ${className}`}
      style={
        tier
          ? {
              borderColor: `${tier.color}55`,
              background: tier.index >= 2 ? tier.gradient : `${tier.color}0d`,
              boxShadow: tier.index >= 4 ? tier.glow || undefined : undefined,
            }
          : undefined
      }
    >
      {/* Tier-world aura wash (high tiers only) — атмосфера, не данные. */}
      {tier && tier.index >= 3 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
          style={{ background: tier.aura }}
        />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Glyph name="trophy" className="text-accent-gold" />
          Витрина престижа
        </h2>
        {equippedTitle && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
            <Glyph name="crown" className="h-3.5 w-3.5" />
            {equippedTitle.name}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-4">
        {/* Crown jewel — the single rarest thing you have */}
        {crownJewel ? (
          <CrownJewel jewel={crownJewel} />
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
            Открывай кейсы и выбивай редкие предметы — главный трофей появится здесь.
          </div>
        )}

        {/* Standings — where you rank relative to everyone */}
        <div className="flex flex-col gap-2">
          {standings.length > 0 ? (
            standings.map((s) => <StandingPill key={s.key} s={s} />)
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Поднимайся в рейтингах, чтобы занять место в топе сообщества.
            </div>
          )}
        </div>
      </div>

      {/* Mastery footer — how complete you are */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="rounded-2xl border border-border bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Glyph name="medal" className="h-3.5 w-3.5" /> Достижения
            </span>
            <span className="type-stat text-foreground">{achPct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${achPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {mastery.achievementsUnlocked} из {mastery.achievementsTotal}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Glyph name="vault" className="h-3.5 w-3.5" /> Редкие предметы
            </span>
            <span className="type-stat text-foreground">{mastery.rareItemsOwned}</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {mastery.rareItemsOwned > 0
              ? 'rare и выше в коллекции'
              : 'пока нет редких предметов'}
          </p>
        </div>
      </div>
    </section>
  )
}
