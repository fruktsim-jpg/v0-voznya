import Link from 'next/link'
import { SectionTitle } from '@/components/ds/section-title'
import { rarityToken } from '@/lib/rarity'
import type { FeaturedOpportunity } from '@/lib/home-context'

/**
 * Featured Opportunity (VOZNYA REDESIGN — Home Hub, zone 7).
 *
 * Generic curated surface (approved rename from "Featured Drop") — it can
 * promote the best real action for today. Current source is the active cases
 * showcase (`getActiveCasesWithRewards`); the curated pick prefers a real
 * chase (jackpot/limited). There is NO featured/CMS table, so the choice is an
 * honest presentation-side decision over real data, never a fabricated promo.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

function costLabel(kind: string, amount: number): string {
  if (kind === 'key' || kind === 'free' || amount === 0) return 'Бесплатно / по ключу'
  return `${fmt(amount)} 🥚`
}

export function FeaturedOpportunityCard({
  featured,
}: {
  featured: FeaturedOpportunity
}) {
  const token = featured.topReward ? rarityToken(featured.topReward.rarity) : null

  return (
    <section className="px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionTitle eyebrow="Featured" icon="🎁" size="md" className="mb-4">
          Возможность дня
        </SectionTitle>

        <Link href={featured.href} className="group block">
          <div
            className="glass relative overflow-hidden rounded-3xl border p-5 transition group-hover:-translate-y-0.5 sm:p-6"
            style={{
              borderColor: token ? `${token.color}66` : undefined,
              boxShadow: token?.glow || undefined,
              backgroundImage: token?.capsule,
            }}
          >
            {featured.hasChase && (
              <span className="absolute right-4 top-4 rounded-full bg-[#EB4B4B]/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#ff8a8a]">
                редкий шанс
              </span>
            )}

            <div className="flex items-start gap-4">
              <span
                className="grid size-16 shrink-0 place-items-center rounded-2xl text-4xl"
                style={{ background: token?.gradient ?? 'rgba(255,255,255,0.05)' }}
                aria-hidden
              >
                📦
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold text-foreground">
                  {featured.name}
                </h3>
                {featured.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {featured.description}
                  </p>
                )}
                {featured.topReward && token && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">В погоне: </span>
                    <span className="font-semibold" style={{ color: token.color }}>
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
                Открыть
                <span aria-hidden>→</span>
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
