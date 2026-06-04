'use client'

import { motion } from 'framer-motion'
import {
  Handshake,
  Mic2,
  PartyPopper,
  Gamepad2,
  Megaphone,
  Laugh,
} from 'lucide-react'
import { Reveal } from './reveal'

const FEATURES = [
  { icon: Handshake, title: 'Друзья', text: 'Люди на одной волне' },
  { icon: Mic2, title: 'Концерты', text: 'Ивенты большой компанией' },
  { icon: PartyPopper, title: 'Сходки', text: 'Встречи по всей стране' },
  { icon: Gamepad2, title: 'Игры', text: 'Discord и совместные катки' },
  { icon: Megaphone, title: 'Новости', text: 'Жизнь в Нидерландах' },
  { icon: Laugh, title: 'Мемы', text: 'Чат не затихает 24/7' },
]

export function Features() {
  return (
    <section className="relative px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Почему люди <span className="text-gradient">вступают</span>
          </h2>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-5 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -5 }}
              className="glass group relative overflow-hidden rounded-2xl border border-border p-4 sm:p-6"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30 sm:h-12 sm:w-12">
                <f.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="relative mt-4 text-base font-semibold text-foreground sm:text-lg">
                {f.title}
              </h3>
              <p className="relative mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {f.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
