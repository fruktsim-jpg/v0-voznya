import type { Metadata } from 'next'
import { ScreenHeader } from '@/components/v2/screen-header'
import { SiteFooter } from '@/components/voznya/site-footer'
import { DrunFeed } from '@/components/drun/drun-feed'
import { DrunWorldviewSection } from '@/components/drun/drun-worldview-section'
import { DrunRankingsSection } from '@/components/drun/drun-rankings-section'
import { getDrunFeed } from '@/lib/drun-feed'
import { getDrunWorldview } from '@/lib/drun-worldview'
import { getDrunRankings } from '@/lib/drun-rankings'

export const metadata: Metadata = {
  title: 'Друн говорит',
  description:
    'Тёмный друн — живой дух Возни. Что он наблюдает, комментирует и помнит о мире и игроках.',
}

export const dynamic = 'force-dynamic'

/**
 * /drun — public read-only "Друн говорит" feed (Phase A — Drun public presence).
 *
 * The window into Drun's voice for players who never open the Telegram group:
 * his autonomous commentary, worldview storylines and event results, mirrored
 * to the WEB presence surface (ai_messages channel='web'). Newest first,
 * infinite scroll. No auth, no moderation — player-facing only.
 */
export default async function DrunPage() {
  // Live utterances + worldview chronicle + social rankings. All read-only and
  // fail-silent → load in parallel; each section hides itself when empty.
  const [initial, worldview, rankings] = await Promise.all([
    getDrunFeed(20),
    getDrunWorldview(),
    getDrunRankings(),
  ])
  return (
    <main className="relative min-h-svh overflow-x-hidden pb-24">
      <ScreenHeader
        icon="sparkles"
        title="Друн говорит"
        kicker="Живой дух Возни"
        accent="violet"
      />
      <DrunWorldviewSection data={worldview} />
      <DrunRankingsSection data={rankings} />
      <DrunFeed initial={initial} />
      <SiteFooter />
    </main>
  )
}
