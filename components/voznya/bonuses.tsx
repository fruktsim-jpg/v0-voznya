'use client'

import { motion } from 'framer-motion'
import { Gift, Star, UserPlus } from 'lucide-react'
import { Reveal } from './reveal'

const BONUSES = [
  { icon: Gift, title: 'Розыгрыши', text: 'Регулярные розыгрыши среди участников сообщества' },
  { icon: Star, title: 'Бонусы за активность', text: 'Награды за участие в жизни ВОЗНИ' },
  { icon: UserPlus, title: 'Бонусы за друзей', text: 'Приглашай друзей и получай бонусы' },
]

export function Bonuses() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-center text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Розыгрыши и <span className="text-gradient">бонусы</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {BONUSES.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6 }}
              className="glass relative overflow-hidden rounded-2xl border border-border p-7 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_24px_-6px_rgba(139,92,246,0.8)]">
                <b.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {b.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
