import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LiveCommunityStats } from '@/components/live/community-stats'
import { TopRich } from '@/components/live/top-rich'
import { EconomyPanel } from '@/components/live/economy-panel'
import { DailyPanel } from '@/components/live/daily-panel'
import { BotFeatures } from '@/components/live/bot-features'
import { CommandsExplorer } from '@/components/live/commands-explorer'
import { SiteFooter } from '@/components/voznya/site-footer'

export const metadata: Metadata = {
  title: 'Живая статистика ВОЗНИ',
  description: 'Экономика, достижения и активность сообщества ВОЗНЯ в реальном времени.',
}

export default function LivePage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <section className="relative overflow-hidden px-6 pb-6 pt-20 text-center sm:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/20 blur-[120px]"
        />
        <div className="relative mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            🔥 Живая статистика <span className="text-gradient">ВОЗНИ</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
            Экономика, достижения и активность сообщества в реальном времени.
          </p>
        </div>
      </section>

      <LiveCommunityStats />
      <TopRich />
      <EconomyPanel />
      <DailyPanel />
      <BotFeatures />
      <CommandsExplorer />
      <SiteFooter />
    </main>
  )
}
