'use client'

import { Rocket } from 'lucide-react'
import { TELEGRAM_GROUP } from '@/lib/voznya'
import { Reveal } from './reveal'

export function FinalCta() {
  return (
    <section id="join" className="relative scroll-mt-20 px-6 py-28 sm:py-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[680px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[130px]"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Готов стать частью <span className="text-gradient">ВОЗНИ</span>?
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-lg text-muted-foreground text-pretty sm:text-xl">
            Более 400 участников уже внутри.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <a
            href={TELEGRAM_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mt-10 inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-10 py-5 text-lg font-semibold text-primary-foreground shadow-[0_0_50px_-8px_rgba(139,92,246,0.9)] transition-transform hover:scale-[1.03] active:scale-95"
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
