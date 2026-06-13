import Link from 'next/link'
import type { ReactNode } from 'react'
import { SectionTitle } from '@/components/ds/section-title'
import { VoznyaCoin, Glyph } from '@/components/ds/icon'
import { ItemArt } from '@/components/ds/item-art'
import { rarityToken } from '@/lib/rarity'
import type { FeaturedOpportunity, HotToday as HotTodayData } from '@/lib/home-context'

/**
 * Hot Today (VOZNYA REDESIGN — Home, zone 2: what's hot right now).
 *
 * The "trending / storefront" surface — Steam-store energy. Answers "what's hot
 * today / what opportunity exists right now". Combines:
 *   - the featured opportunity (curated pick over real active cases), and
 *   - real superlatives derived from the live feed (biggest win, rarest drop)
 *     plus jackpot / gift-drop counts as "the world is winning" proof.
 *
 * All DB-backed. Superlatives are ranked from real feed events, never invented.
 * "Today" = the recent fetched window (we don't claim calendar-day math we can't
 * back). The whole block self-hides if there's nothing real to show.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

function costLabel(kind: string, amount: number): ReactNode {
  if (kind === 'key' || kind === 'free' || amount === 0) return 'по ключу'
  return (
    <span className="inline-flex items-center gap-1">
      <span className="type-economy">{fmt(amount)}</span> <VoznyaCoin tone="gold" />
    </span>
  )
}

export function HotToday({
  hot,
  featured,
}: {
  hot: HotTodayData
  featured: FeaturedOpportunity | null
}) {
  const hasHighlights =
    hot.biggestWin || hot.rarestDrop || hot.jackpots > 0 || hot.giftDrops > 0
  if (!featured && !hasHighlights) return null

  const fToken = featured?.topReward ? rarityToken(featured.topReward.rarity) : null

  return (
    <section className="px-4 pt-5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionTitle eyebrow="Trending" icon={<Glyph name="flame" />} size="md" className="mb-4">
          Что горячо сейчас
        </SectionTitle>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
          {/* Featured opportunity — storefront card */}
          {featured && (
            <Link href={featured.href} className="group block">
              <div
                className="glass relative h-full overflow-hidden rounded-3xl border p-5 transition group-hover:-translate-y-0.5"
                style={{
                  borderColor: fToken ? `${fToken.color}66` : undefined,
                  boxShadow: fToken?.glow || undefined,
                  backgroundImage: fToken?.capsule,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow text-[#b79bff]">Возможность дня</span>
                  {featured.hasChase && (
                    <span className="rounded-full bg-[#EB4B4B]/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#ff8a8a]">
                      редкий шанс
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-start gap-4">
                  {/* Track 1: настоящий ItemArt вместо хардкод-эмодзи 📦.
                      Показываем арт топ-награды кейса (или сам кейс как
                      запасной вариант) — реальный объект желания. */}
                  <div className="shrink-0">
                    <ItemArt
                      code={featured.topReward?.code ?? featured.itemCode}
                      rarity={featured.topReward?.rarity ?? 'common'}
                      glyph="📦"
                      size="lg"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-foreground">
                      {featured.name}
                    </h3>
                    {featured.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {featured.description}
                      </p>
                    )}
                    {featured.topReward && fToken && (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">В погоне: </span>
                        <span className="font-semibold" style={{ color: fToken.color }}>
                          {featured.topReward.name}
                        </span>
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          {featured.topReward.chance < 1
                            ? featured.topReward.chance.toFixed(2)
                            : featured.topReward.chance.toFixed(1)}
                          %
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-foreground">
                    {costLabel(featured.openCostKind, featured.openCostAmount)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#8847FF] px-4 py-2 text-sm font-semibold text-white transition group-hover:translate-x-0.5">
                    Открыть <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Real superlatives from the live feed */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {hot.biggestWin && (
              <Highlight
                eyebrow="Крупнейший выигрыш"
                icon={hot.biggestWin.icon}
                rarity={hot.biggestWin.rarity}
                actorId={hot.biggestWin.actorId}
                primary={
                  hot.biggestWin.value != null
                    ? (
                      <span className="inline-flex items-center gap-1">
                        +<span className="type-economy">{fmt(hot.biggestWin.value)}</span> <VoznyaCoin tone="gold" />
                      </span>
                    )
                    : hot.biggestWin.actorName
                }
                secondary={hot.biggestWin.actorName}
              />
            )}
            {hot.rarestDrop && (
              <Highlight
                eyebrow="Редчайший дроп"
                icon={hot.rarestDrop.icon}
                rarity={hot.rarestDrop.rarity}
                actorId={hot.rarestDrop.actorId}
                primary={rarityToken(hot.rarestDrop.rarity).label}
                secondary={hot.rarestDrop.actorName}
              />
            )}
            {(hot.jackpots > 0 || hot.giftDrops > 0) && (
              <div className="glass flex items-center gap-4 rounded-2xl border border-border p-4">
                {hot.jackpots > 0 && (
                  <div className="flex flex-col">
                    <span className="font-mono text-2xl font-bold text-foreground">
                      {hot.jackpots}
                    </span>
                    <span className="text-xs text-muted-foreground">💎 джекпотов</span>
                  </div>
                )}
                {hot.giftDrops > 0 && (
                  <div className="flex flex-col">
                    <span className="font-mono text-2xl font-bold text-foreground">
                      {hot.giftDrops}
                    </span>
                    <span className="text-xs text-muted-foreground">🎁 подарков выпало</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Highlight({
  eyebrow,
  icon,
  rarity,
  actorId,
  primary,
  secondary,
}: {
  eyebrow: string
  icon: string
  rarity: Parameters<typeof rarityToken>[0]
  actorId: number
  primary: ReactNode
  secondary: string
}) {
  const token = rarityToken(rarity)
  return (
    <Link
      href={`/profile/${actorId}`}
      className="glass flex items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5"
      style={{ borderColor: `${token.color}55` }}
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl"
        style={{ background: token.capsule }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="label-eyebrow text-muted-foreground">{eyebrow}</p>
        <p className="truncate font-bold" style={{ color: token.color }}>
          {primary}
        </p>
        <p className="truncate text-xs text-muted-foreground">{secondary}</p>
      </div>
    </Link>
  )
}
