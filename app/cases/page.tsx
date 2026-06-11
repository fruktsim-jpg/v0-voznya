import Link from 'next/link'
import { getActiveCasesWithRewards } from '@/lib/cases'
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
 * Cases (Stage 3 — Opening Experience). The cases hub as a premium product: a
 * featured hero, category filters and a value-first grid (each tile reads its
 * rarity profile + chase reward at a glance). The full opening experience —
 * anticipation, a decelerating reel, a rarity-scaled reveal, sound/haptics and
 * gift fate — lives in the detail sheet (CasesHub → CaseDetailSheet).
 *
 * The economy/RNG is UNCHANGED: open_case (bot, shared DB) stays the single
 * writer, reached via /api/cases/open. This page only reads catalog data and
 * derives presentation (lib/cases, lib/cases-ux).
 */
export default async function CasesPage() {
  const rawCases = await getActiveCasesWithRewards()
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
          <CasesHub cases={cases} />
        )}
      </div>
    </main>
  )
}
