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
    <section id="platforms" className="relative scroll-mt-4 px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Площадки <span className="text-gradient">ВОЗНИ</span>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground text-pretty sm:mt-5 sm:text-lg">
            Выбери, где тебе удобно.
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-5 lg:grid-cols-3">
          {PLATFORMS.map((p, i) => {
            const Icon = ICONS[p.name] ?? Send
            const primary = 'primary' in p && p.primary
            return (
              <motion.a
                key={p.title}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -5 }}
                className={`glass group relative flex flex-col overflow-hidden rounded-2xl border p-4 transition-colors sm:p-6 ${
                  primary
                    ? 'col-span-2 border-primary/50 bg-primary/10 lg:col-span-1'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="relative flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30 sm:h-12 sm:w-12">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  {primary ? (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      Главное
                    </span>
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  )}
                </div>

                <h3 className="relative mt-4 text-base font-semibold text-foreground sm:text-lg">
                  {p.title}
                </h3>
                <p className="relative mt-1 flex-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {p.description}
                </p>
                <span className="relative mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary sm:mt-5">
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
