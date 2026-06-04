'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 1600,
  format = true,
}: {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  format?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const from = display
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration])

  const text = format ? display.toLocaleString('ru-RU') : String(display)

  return (
    <span ref={ref}>
      {prefix}
      {text}
      {suffix}
    </span>
  )
}
