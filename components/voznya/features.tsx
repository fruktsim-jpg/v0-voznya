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
  { icon: Handshake, title: 'Найти друзей', text: 'Знакомства с людьми на одной волне' },
  { icon: Mic2, title: 'Совместные концерты', text: 'Ходим на ивенты большой компанией' },
  { icon: PartyPopper, title: 'Сходки и мероприятия', text: 'Встречи в реальной жизни по всей стране' },
  { icon: Gamepad2, title: 'Игры и Discord', text: 'Голосовые каналы и совместные катки' },
  { icon: Megaphone, title: 'Новости и инфо', text: 'Полезная информация о жизни в Нидерландах' },
  { icon: Laugh, title: 'Мемы и общение', text: 'Живой чат, который не затихает 24/7' },
]

export function Features() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Почему люди <span className="text-gradient">вступают</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6 }}
              className="glass group relative overflow-hidden rounded-2xl border border-border p-6"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="relative mt-5 text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
