'use client'

import { motion } from 'framer-motion'
import { Gift, Star, UserPlus } from 'lucide-react'
import { Reveal } from './reveal'

const BONUSES = [
  { icon: Gift, title: 'Розыгрыши', text: 'Регулярно среди участников' },
  { icon: Star, title: 'За активность', text: 'Награды за участие' },
  { icon: UserPlus, title: 'За друзей', text: 'Приглашай и получай бонусы' },
]

export function Bonuses() {
  return (
    <section className="relative px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Розыгрыши и <span className="text-gradient">бонусы</span>
          </h2>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-5">
          {BONUSES.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -5 }}
              className="glass relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border p-4 text-left sm:flex-col sm:p-7 sm:text-center"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_24px_-6px_rgba(139,92,246,0.8)] sm:h-14 sm:w-14">
                <b.icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="sm:mt-5">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">{b.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                  {b.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
