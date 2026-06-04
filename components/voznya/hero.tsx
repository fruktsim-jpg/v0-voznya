'use client'

import { motion } from 'framer-motion'
import { Rocket, Users, MapPin, Flame } from 'lucide-react'
import { Particles } from './particles'
import { AnimatedCounter } from './animated-counter'

function scrollToPlatforms() {
  document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' })
}

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-10 text-center sm:py-24">
      {/* glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[100px] sm:h-[640px] sm:w-[640px] sm:blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,#09090b_85%)]"
      />
      <Particles />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-gradient text-6xl font-bold tracking-tight text-balance drop-shadow-[0_0_40px_rgba(139,92,246,0.45)] sm:text-8xl md:text-9xl"
        >
          ВОЗНЯ
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-3 max-w-xl text-base text-muted-foreground text-pretty sm:mt-6 sm:text-xl"
        >
          Русскоязычное комьюнити Нидерландов 🇳🇱
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-6 grid w-full max-w-md grid-cols-3 gap-2.5 sm:mt-10 sm:gap-4"
        >
          <Stat icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />} value={<AnimatedCounter value={400} suffix="+" />} label="участников" />
          <Stat icon={<MapPin className="h-4 w-4 sm:h-5 sm:w-5" />} value={<AnimatedCounter value={10} suffix="+" />} label="городов" />
          <Stat icon={<Flame className="h-4 w-4 sm:h-5 sm:w-5" />} value="24/7" label="общение" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-7 sm:mt-12"
        >
          <button
            onClick={scrollToPlatforms}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_0_40px_-8px_rgba(139,92,246,0.8)] transition-transform hover:scale-[1.03] active:scale-95 sm:px-8 sm:py-4"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <Rocket className="h-5 w-5" />
            Вступить в ВОЗНЮ
          </button>
        </motion.div>
      </div>
    </section>
  )
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: React.ReactNode
  label: string
}) {
  return (
    <div className="glass flex flex-col items-center gap-0.5 rounded-xl border border-border px-2 py-3 sm:gap-1 sm:rounded-2xl sm:px-4 sm:py-5">
      <span className="text-primary">{icon}</span>
      <span className="text-lg font-bold text-foreground sm:text-2xl">{value}</span>
      <span className="text-[11px] text-muted-foreground sm:text-sm">{label}</span>
    </div>
  )
}
