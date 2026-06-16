'use client'

import { AreaTrend, Sparkline, RadialGauge } from '@/components/ds/charts'
import { MiniBar } from '@/components/ds/donut'
import { SectionTitle } from '@/components/ds/section-title'
import type { GrowthMetric } from '@/lib/player-stats'
import type { Standing, CrownJewel } from '@/lib/prestige-summary'
import { rarityToken, type Rarity } from '@/lib/rarity'

/**
 * StatsView — the Statistics DESTINATION (player-facing identity surface), not
 * a dashboard. It answers, top-to-bottom: Who am I (identity + crown jewel) →
 * How do I compare (standings) → Am I growing (trajectory) → mastery. Pure
 * presentational: takes server-computed data, renders with the DS chart kit.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')
const fmtSigned = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n))

export type StatsViewData = {
  name: string
  identityLine: string
  story: string[]
  standings: Standing[]
  crownJewel: CrownJewel | null
  mastery: { achievementsUnlocked: number; achievementsTotal: number; rareItemsOwned: number }
  windowDays: number
  wealth: GrowthMetric | null
  mmr: GrowthMetric | null
  voice: GrowthMetric | null
}

function DeltaBadge({ m }: { m: GrowthMetric }) {
  const up = m.delta > 0
  const flat = m.delta === 0
  const tone = flat ? 'text-muted-foreground' : up ? 'text-emerald-300' : 'text-rose-300'
  const arrow = flat ? '→' : up ? '↑' : '↓'
  return (
    <span className={`text-xs font-semibold ${tone}`}>
      {arrow} {fmtSigned(m.delta)}
      {m.deltaPct != null && ` (${m.deltaPct > 0 ? '+' : ''}${Math.round(m.deltaPct)}%)`}
    </span>
  )
}

function MetricCard({ m, color }: { m: GrowthMetric; color: string }) {
  return (
    <div className="glass rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="label-eyebrow">{m.label}</div>
          <div className="mt-0.5 type-stat text-2xl text-foreground">{fmt(m.now)}</div>
        </div>
        <DeltaBadge m={m} />
      </div>
      {m.series.length > 1 && (
        <div className="mt-2">
          <Sparkline data={m.series} color={color} width={9999} height={40} />
        </div>
      )}
      <div className="mt-1 text-[10px] text-muted-foreground/70">за {m.series.length} дн.</div>
    </div>
  )
}

export function StatsView({ data }: { data: StatsViewData }) {
  const { wealth } = data
  const masteryPct =
    data.mastery.achievementsTotal > 0
      ? (data.mastery.achievementsUnlocked / data.mastery.achievementsTotal) * 100
      : 0

  return (
    <div className="space-y-6">
      {/* WHO AM I — identity + the one-line story */}
      <section className="glass rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-transparent p-5">
        <h1 className="type-display text-2xl text-foreground">{data.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.identityLine}</p>
        {data.story.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.story.map((s, i) => (
              <span key={i} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-foreground">
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* HOW DO I COMPARE — standings */}
      {data.standings.length > 0 && (
        <section>
          <SectionTitle size="md" className="mb-3">Где я среди всех</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.standings.map((s) => (
              <div key={s.key} className="glass rounded-2xl border border-border p-4 text-center">
                <div className="label-eyebrow">{s.label}</div>
                <div className="mt-1 type-stat text-2xl text-foreground">
                  {s.isFirst ? '№1' : `Топ ${s.topPercent}%`}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground/70">
                  #{fmt(s.rank)} из {fmt(s.total)}
                </div>
                <MiniBar
                  value={s.isFirst ? 1 : Math.max(0, Math.min(1, 1 - s.topPercent / 100))}
                  color="var(--accent-indigo)"
                  height={6}
                  className="mt-2.5"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AM I GROWING — trajectory */}
      <section>
        <SectionTitle size="md" className="mb-3">
          Моя траектория · {data.windowDays} дн.
        </SectionTitle>
        {wealth && wealth.series.length > 1 && (
          <div className="glass mb-3 rounded-2xl border border-border p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="section-title text-sm text-foreground">Богатство</span>
              <DeltaBadge m={wealth} />
            </div>
            <AreaTrend data={wealth.series} xKey="day" yKey="value" color="var(--accent-gold, #f5c451)" height={180} format={(v) => fmt(v)} />
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.mmr && <MetricCard m={data.mmr} color="var(--accent-indigo)" />}
          {data.voice && <MetricCard m={data.voice} color="var(--accent-teal, #4fd1c5)" />}
          {!wealth && data.wealth && <MetricCard m={data.wealth} color="var(--accent-gold, #f5c451)" />}
        </div>
      </section>

      {/* WHAT AM I KNOWN FOR — crown jewel + mastery */}
      <section className="grid gap-3 sm:grid-cols-2">
        {data.crownJewel && (
          <div
            className="glass rounded-2xl border p-4"
            style={{ borderColor: `${rarityToken(data.crownJewel.rarity as Rarity).color}55` }}
          >
            <div className="label-eyebrow">Главная гордость</div>
            <div className="mt-1 type-prestige text-lg" style={{ color: rarityToken(data.crownJewel.rarity as Rarity).color }}>
              {data.crownJewel.name}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{data.crownJewel.note}</div>
          </div>
        )}
        <div className="glass flex items-center gap-4 rounded-2xl border border-border p-4">
          <RadialGauge value={masteryPct} size={92} label="ачивки" color="var(--primary)" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              {data.mastery.achievementsUnlocked} / {data.mastery.achievementsTotal}
            </div>
            <div className="text-[11px] text-muted-foreground">достижений открыто</div>
            {data.mastery.rareItemsOwned > 0 && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {data.mastery.rareItemsOwned} редких предметов
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
