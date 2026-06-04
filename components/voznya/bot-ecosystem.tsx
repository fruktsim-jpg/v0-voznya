'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bot, ArrowRight } from 'lucide-react'
import { BOT_SYSTEMS } from '@/lib/voznya-bot'
import { Reveal } from './reveal'

export function BotEcosystem() {
  return (
    <section className="relative px-6 py-12 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[680px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]"
      />
      <div className="relative mx-auto max-w-5xl">
        <Reveal className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" />
            Бот ВОЗНИ
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="mt-5 text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Своя <span className="text-gradient">экосистема</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground text-pretty sm:mt-5 sm:text-lg">
            Экономика на ешках, ачивки, титулы, дуэли, ферма и рейтинги — прямо в чате.
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-5">
          {BOT_SYSTEMS.slice(0, 6).map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
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
              <div className="text-2xl sm:text-3xl">{s.emoji}</div>
              <h3 className="relative mt-3 text-base font-semibold text-foreground sm:text-lg">
                {s.title}
              </h3>
              <p className="relative mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/live"
            className="group inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-primary/20 sm:px-8 sm:py-4"
          >
            Открыть статистику
            <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
