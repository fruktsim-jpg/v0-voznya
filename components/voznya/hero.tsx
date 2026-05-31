'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Rocket, Users, MapPin, Flame } from 'lucide-react'
import { Particles } from './particles'
import { AnimatedCounter } from './animated-counter'

function scrollToJoin() {
  document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })
}

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-28 text-center">
      {/* glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,#09090b_85%)]"
      />
      <Particles />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-10"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 scale-125 rounded-full bg-primary/40 blur-3xl"
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            <Image
              src="/voznya-logo.png"
              alt="Логотип сообщества ВОЗНЯ"
              width={150}
              height={150}
              priority
              className="h-32 w-32 drop-shadow-[0_0_40px_rgba(139,92,246,0.5)] sm:h-36 sm:w-36"
            />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-gradient text-6xl font-bold tracking-tight text-balance sm:text-7xl md:text-8xl"
        >
          ВОЗНЯ
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty sm:text-xl"
        >
          Самое шумное русскоязычное комьюнити Нидерландов 🇳🇱
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Stat icon={<Users className="h-5 w-5" />} value={<><AnimatedCounter value={400} suffix="+" /></>} label="участников" />
          <Stat icon={<MapPin className="h-5 w-5" />} value={<><AnimatedCounter value={10} suffix="+" /></>} label="городов" />
          <Stat icon={<Flame className="h-5 w-5" />} value="24/7" label="общение" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-12"
        >
          <button
            onClick={scrollToJoin}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-[0_0_40px_-8px_rgba(139,92,246,0.8)] transition-transform hover:scale-[1.03] active:scale-95"
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
    <div className="glass flex flex-col items-center gap-1 rounded-2xl border border-border px-4 py-5">
      <span className="text-primary">{icon}</span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
