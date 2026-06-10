import Link from 'next/link'
import { SectionTitle } from '@/components/ds/section-title'
import type { NextGoal } from '@/lib/home-context'

/**
 * Next Goals (VOZNYA REDESIGN — Home Hub, zone 6).
 *
 * Answers "What should I do next?". Goals are computed in the aggregator from
 * real progression (season division, MMR rank, streak) plus an always-available
 * action. No daily-claim/weekly-mission goals are shown — those require
 * bot-owned writes and remain future slots, so we only promise what's real.
 */
export function NextGoals({ goals }: { goals: NextGoal[] }) {
  if (goals.length === 0) return null

  return (
    <section className="px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionTitle eyebrow="Что дальше" size="md" className="mb-4">
          Твои цели
        </SectionTitle>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {goals.map((g) => (
            <Link
              key={g.id}
              href={g.href}
              className="glass group flex items-center gap-3 rounded-2xl border border-border p-3.5 transition hover:border-white/20"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xl"
                aria-hidden
              >
                {g.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {g.label}
                </p>
                {g.hint && (
                  <p className="text-xs text-muted-foreground">{g.hint}</p>
                )}
                {typeof g.ratio === 'number' && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(g.ratio * 100)}%`,
                        background: 'linear-gradient(90deg, #4B69FF, #8847FF)',
                      }}
                    />
                  </div>
                )}
              </div>
              <span
                className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
