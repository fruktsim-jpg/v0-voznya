'use client'

import { motion } from 'framer-motion'
import { useApi } from '@/hooks/use-api'
import type { Daily } from '@/lib/queries'

export function DailyPanel() {
  const { data } = useApi<Daily>('/api/daily', 30_000)

  if (!data) return null
  const hasPara = Boolean(data.para)
  const hasPidor = Boolean(data.pidor)
  if (!hasPara && !hasPidor) return null

  return (
    <section className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          Номинации <span className="text-gradient">дня</span>
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:gap-5">
          {hasPara && data.para && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45 }}
              className="glass flex items-center gap-4 rounded-2xl border border-pink-500/30 bg-pink-500/5 p-5"
            >
              <div className="text-3xl sm:text-4xl">❤️</div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Пара дня</div>
                <div className="mt-0.5 truncate text-base font-bold text-foreground sm:text-lg">
                  {data.para.first} <span className="text-pink-400">&</span> {data.para.second}
                </div>
              </div>
            </motion.div>
          )}

          {hasPidor && data.pidor && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="glass flex items-center gap-4 rounded-2xl border border-border p-5"
            >
              <div className="text-3xl sm:text-4xl">🏳️‍🌈</div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Пидор дня</div>
                <div className="mt-0.5 truncate text-base font-bold text-foreground sm:text-lg">
                  {data.pidor.name}
                  {data.pidor.count > 0 && (
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      ×{data.pidor.count}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
