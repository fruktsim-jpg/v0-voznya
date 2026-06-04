'use client'

import { Plane } from 'lucide-react'
import { Reveal } from './reveal'

export function Newcomer() {
  return (
    <section className="relative px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl border border-border p-6 text-center sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.18),transparent_70%)]"
            />
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30 sm:h-16 sm:w-16">
              <Plane className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h2 className="relative mt-5 text-2xl font-bold tracking-tight text-balance sm:text-4xl">
              Только приехал?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:mt-5 sm:text-xl">
              ВОЗНЯ поможет освоиться и найти своих.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
