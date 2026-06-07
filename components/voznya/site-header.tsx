'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { UserMenu } from '@/components/auth/user-menu'

interface SiteHeaderProps {
  /** Public Telegram bot id for the branded login button (classic fallback). */
  botId?: string | null
  /** When true, the login button uses the Telegram OIDC flow. */
  oidcEnabled?: boolean
}

export function SiteHeader({ botId, oidcEnabled }: SiteHeaderProps = {}) {

  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 pt-safe transition-colors duration-300 ${
        scrolled ? 'border-b border-border bg-background/80 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-safe sm:px-6">

        <Link href="/" className="text-lg font-bold tracking-tight text-gradient">
          ВОЗНЯ
        </Link>

        <div className="flex items-center gap-2">
          {/* Stats link: icon-only on mobile to keep the header uncluttered. */}
          <Link
            href="/live"
            aria-label="Живая статистика"
            className="group inline-flex h-9 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20 sm:px-4"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Activity className="hidden h-4 w-4 text-primary sm:block" />
            <span className="hidden sm:inline">Статистика</span>
          </Link>
          <UserMenu botId={botId} oidcEnabled={oidcEnabled} />

        </div>
      </div>
    </header>
  )
}
