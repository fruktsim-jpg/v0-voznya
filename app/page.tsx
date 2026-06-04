import { Hero } from '@/components/voznya/hero'
import { LiveStats } from '@/components/voznya/live-stats'
import { Platforms } from '@/components/voznya/platforms'
import { BotEcosystem } from '@/components/voznya/bot-ecosystem'
import { About } from '@/components/voznya/about'
import { Features } from '@/components/voznya/features'
import { Bonuses } from '@/components/voznya/bonuses'
import { FinalCta } from '@/components/voznya/final-cta'
import { SiteFooter } from '@/components/voznya/site-footer'
import { StickyCta } from '@/components/voznya/sticky-cta'

export default function Page() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <Hero />
      <LiveStats />
      <Platforms />
      <BotEcosystem />
      <About />
      <Features />
      <Bonuses />
      <FinalCta />
      <SiteFooter />
      <StickyCta />
    </main>
  )
}
