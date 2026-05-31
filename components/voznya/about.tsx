'use client'

import { Sparkles } from 'lucide-react'
import { Reveal } from './reveal'

export function About() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <Reveal className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />О сообществе
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="mt-6 text-center text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Что такое <span className="text-gradient">ВОЗНЯ</span>?
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass relative mt-12 overflow-hidden rounded-3xl border border-border p-8 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
            />
            <p className="relative text-lg leading-relaxed text-muted-foreground sm:text-xl">
              <span className="font-semibold text-foreground">ВОЗНЯ</span> — это
              русскоязычное сообщество людей из Нидерландов.
            </p>
            <p className="relative mt-5 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Здесь знакомятся, находят друзей, посещают концерты, встречаются в
              реальной жизни, помогают друг другу, обсуждают новости и просто
              хорошо проводят время.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
