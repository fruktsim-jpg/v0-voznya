'use client'

import { motion } from 'framer-motion'
import { TITLES } from '@/lib/voznya-bot'
import { prestigeForTitleIndex } from '@/lib/ds/prestige'

export function TitlesLadder() {
  // Reverse for display (top title first) but keep the ASCENDING ladder index
  // so each row gets its true tier world — the ladder visibly escalates.
  const ranks = TITLES.map((t, i) => ({ ...t, ladderIndex: i })).reverse()

  return (
    <section id="titles" className="px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
          <span className="text-gradient">Титулы</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Ранг растёт с заработком — от Щавеля до Меллстроя
        </p>

        <div className="mt-8 space-y-2.5">
          {ranks.map((t, i) => {
            const tier = prestigeForTitleIndex(t.ladderIndex, TITLES.length)
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="glass relative flex items-center gap-4 overflow-hidden rounded-2xl border p-3.5 sm:p-4"
                style={{
                  borderColor: `${tier.color}${tier.index >= 2 ? '66' : '33'}`,
                  background: tier.index >= 3 ? tier.gradient : undefined,
                  boxShadow: tier.index >= 4 ? tier.glow || undefined : undefined,
                }}
              >
                {tier.index >= 4 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-6 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full blur-2xl"
                    style={{ background: tier.aura }}
                  />
                )}
                <div className="relative text-2xl sm:text-3xl">{t.emoji}</div>
                <div
                  className="relative min-w-0 flex-1 text-sm font-bold sm:text-base"
                  style={{ color: tier.index >= 2 ? tier.color : undefined }}
                >
                  {t.name}
                </div>
                <div className="relative shrink-0 text-xs text-muted-foreground sm:text-sm">
                  {t.minEarned === 0 ? 'с нуля' : `от ${t.minEarned.toLocaleString('ru-RU')} заработано`}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
