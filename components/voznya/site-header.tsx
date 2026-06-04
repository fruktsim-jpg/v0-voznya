'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-border bg-background/80 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-gradient">
          ВОЗНЯ
        </Link>

        <Link
          href="/live"
          className="group inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <Activity className="hidden h-4 w-4 text-primary sm:block" />
          Статистика
        </Link>
      </div>
    </header>
  )
}
