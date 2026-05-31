'use client'

import { Plane } from 'lucide-react'
import { Reveal } from './reveal'

export function Newcomer() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl border border-border p-8 text-center sm:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.18),transparent_70%)]"
            />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Plane className="h-8 w-8" />
            </div>
            <h2 className="relative mt-6 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Для тех, кто только приехал
            </h2>
            <p className="relative mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl">
              Недавно переехал в Нидерланды? ВОЗНЯ поможет быстрее освоиться,
              найти новых друзей и людей рядом.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
