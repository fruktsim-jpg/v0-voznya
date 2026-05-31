'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

type Particle = {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  drift: number
}

export function Particles({ count = 26 }: { count?: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      duration: Math.random() * 14 + 12,
      delay: Math.random() * 10,
      drift: (Math.random() - 0.5) * 60,
    }))
  }, [count])

  if (!mounted) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/40"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            bottom: -10,
            boxShadow: '0 0 8px rgba(139,92,246,0.8)',
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: ['0%', '-1100%'],
            x: [0, p.drift, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
