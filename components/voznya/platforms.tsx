'use client'

import { motion } from 'framer-motion'
import {
  Send,
  Newspaper,
  Ghost,
  MessageSquare,
  Music2,
  Gamepad2,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { PLATFORMS } from '@/lib/voznya'
import { Reveal } from './reveal'

const ICONS: Record<string, LucideIcon> = {
  Telegram: Send,
  News: Newspaper,
  Snapchat: Ghost,
  'TikTok Chat': MessageSquare,
  TikTok: Music2,
  Discord: Gamepad2,
}

export function Platforms() {
  return (
    <section id="platforms" className="relative scroll-mt-16 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Площадки <span className="text-gradient">ВОЗНИ</span>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-5 max-w-xl text-center text-base text-muted-foreground text-pretty sm:text-lg">
            Выбери, где тебе удобно — Telegram, Snapchat, Discord, TikTok. Все ссылки тут.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((p, i) => {
            const Icon = ICONS[p.name] ?? Send
            return (
              <motion.a
                key={p.title}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6 }}
                className={`glass group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-colors ${
                  'primary' in p && p.primary
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="relative flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                    <Icon className="h-6 w-6" />
                  </div>
                  {'primary' in p && p.primary ? (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      Главное
                    </span>
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  )}
                </div>

                <h3 className="relative mt-5 text-lg font-semibold text-foreground">
                  {p.title}
                </h3>
                <p className="relative mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {p.action}
                </span>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
