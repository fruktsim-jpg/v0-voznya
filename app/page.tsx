import { Hero } from '@/components/voznya/hero'
import { About } from '@/components/voznya/about'
import { Features } from '@/components/voznya/features'
import { Newcomer } from '@/components/voznya/newcomer'
import { Bonuses } from '@/components/voznya/bonuses'
import { Platforms } from '@/components/voznya/platforms'
import { FinalCta } from '@/components/voznya/final-cta'
import { SiteFooter } from '@/components/voznya/site-footer'
import { StickyCta } from '@/components/voznya/sticky-cta'

export default function Page() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <Hero />
      <About />
      <Features />
      <Newcomer />
      <Bonuses />
      <Platforms />
      <FinalCta />
      <SiteFooter />
      <StickyCta />
    </main>
  )
}
