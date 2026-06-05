'use client'

import { motion } from 'framer-motion'
import { TITLES } from '@/lib/voznya-bot'

export function TitlesLadder() {
  const ranks = [...TITLES].reverse()

  return (
    <section id="titles" className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Титулы</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Ранг растёт с заработком — от Щавеля до Меллстроя
        </p>

        <div className="mt-8 space-y-2.5">
          {ranks.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="glass flex items-center gap-4 rounded-2xl border border-border p-3.5 sm:p-4"
            >
              <div className="text-2xl sm:text-3xl">{t.emoji}</div>
              <div className="min-w-0 flex-1 text-sm font-semibold text-foreground sm:text-base">{t.name}</div>
              <div className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                {t.minEarned === 0 ? 'с нуля' : `от ${t.minEarned.toLocaleString('ru-RU')} заработано`}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
