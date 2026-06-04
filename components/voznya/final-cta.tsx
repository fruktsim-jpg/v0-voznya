'use client'

import { Rocket } from 'lucide-react'
import { TELEGRAM_GROUP } from '@/lib/voznya'
import { Reveal } from './reveal'

export function FinalCta() {
  return (
    <section id="join" className="relative scroll-mt-12 px-6 py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[560px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[110px]"
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-6xl">
            Стать частью <span className="text-gradient">ВОЗНИ</span>?
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 text-base text-muted-foreground text-pretty sm:text-xl">
            400+ уже внутри.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <a
            href={TELEGRAM_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-[0_0_50px_-8px_rgba(139,92,246,0.9)] transition-transform hover:scale-[1.03] active:scale-95 sm:mt-10 sm:px-10 sm:py-5 sm:text-lg"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <Rocket className="h-5 w-5" />
            Вступить сейчас
          </a>
        </Reveal>
      </div>
    </section>
  )
}
