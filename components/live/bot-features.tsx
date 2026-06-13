'use client'

import { motion } from 'framer-motion'
import { BOT_SYSTEMS } from '@/lib/voznya-bot'

export function BotFeatures() {
  return (
    <section className="px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
          Системы <span className="text-gradient">бота</span>
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          {BOT_SYSTEMS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="glass rounded-2xl border border-border p-4 text-center sm:p-5"
            >
              <div className="text-2xl sm:text-3xl">{s.emoji}</div>
              <div className="mt-2 text-sm font-semibold text-foreground sm:text-base">{s.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
