import Link from 'next/link'
import {
  getActiveCasesWithRewards,
  getRecentCaseWins,
  getCaseOpenCounts,
} from '@/lib/cases'
import { buildCaseView } from '@/lib/cases-ux'
import { CasesHub } from '@/components/cases/cases-hub'
import { ScreenHeader } from '@/components/v2/screen-header'
import { Glyph } from '@/components/ds/icon/glyph'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Кейсы — Возня',
  description: 'Открывай кейсы Возни: ешки, Telegram Gifts, Premium и джекпоты. Честные шансы.',
}

/**
 * Cases — the primary emotional ACQUISITION loop ("я хочу это"). The storefront's
 * job is desire BEFORE the reel and the itch AFTER it; the opening reel itself is
 * unchanged (already premium). Shows the DREAM (real top rewards as rarity art),
 * real scarcity (max_global_supply − granted_count → "осталось N"), and real
 * social proof (recent wins from the case_openings ledger).
 *
 * The economy/RNG is UNCHANGED: open_case (bot, shared DB) stays the single
 * writer, reached via /api/cases/open. This page only READS catalog + ledger
 * data and derives presentation (lib/cases, lib/cases-ux).
 */
export default async function CasesPage() {
  const [rawCases, recentWins, openCounts] = await Promise.all([
    getActiveCasesWithRewards(),
    getRecentCaseWins(12),
    getCaseOpenCounts(),
  ])
  const cases = rawCases.map(buildCaseView)

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader
        icon="case"
        title="Кейсы"
        kicker="Открывай и поднимайся"
        accent="indigo"
        action={
          <Link href="/inventory" className="text-sm font-medium text-primary hover:underline">
            Инвентарь
          </Link>
        }
      />

      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        {cases.length === 0 ? (
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
            <Glyph name="case" className="mx-auto mb-2 text-3xl text-accent-indigo" />
            <p className="text-sm text-muted-foreground">
              Активных кейсов пока нет. Загляни позже — скоро добавим.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              ← На главную
            </Link>
          </div>
        ) : (
          <CasesHub
            cases={cases}
            recentWins={recentWins}
            openCounts={Object.fromEntries(openCounts)}
          />
        )}
      </div>
    </main>
  )
}
