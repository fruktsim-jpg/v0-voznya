'use client'

import { Sparkles } from 'lucide-react'
import { Reveal } from './reveal'

export function About() {
  return (
    <section className="relative px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Reveal className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />О сообществе
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="mt-5 text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Что такое <span className="text-gradient">ВОЗНЯ</span>?
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass relative mt-8 overflow-hidden rounded-3xl border border-border p-6 sm:mt-10 sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
            />
            <p className="relative text-center text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl">
              Общение, знакомства, концерты, сходки и новые друзья по всей
              стране.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
