'use client'

import { useEffect, useMemo, useState } from 'react'

type Particle = {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  drift: number
}

/**
 * Particles — амбиентный дрейф искр на лендинг-герое. Чистый CSS (transform/
 * opacity), без framer-motion и без per-frame box-shadow: 26 бесконечных JS-
 * анимаций заменены одной GPU-keyframe (.voznya-particle в globals.css).
 * Полностью отключается под prefers-reduced-motion. На мобильных частиц меньше.
 */
export function Particles({ count = 26 }: { count?: number }) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && window.matchMedia) {
      setIsMobile(window.matchMedia('(max-width: 640px)').matches)
    }
  }, [])

  const effectiveCount = isMobile ? Math.ceil(count / 2) : count

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: effectiveCount }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      duration: Math.random() * 14 + 12,
      delay: Math.random() * 10,
      drift: (Math.random() - 0.5) * 60,
    }))
  }, [effectiveCount])

  if (!mounted) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="voznya-particle"
          style={
            {
              '--left': `${p.left}%`,
              '--size': `${p.size}px`,
              '--dur': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
