import Link from 'next/link'
import { getActiveCasesWithRewards } from '@/lib/cases'
import { buildCaseView } from '@/lib/cases-ux'
import { CaseCard } from '@/components/v2/case-card'
import { ScreenHeader } from '@/components/v2/screen-header'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Кейсы — Возня',
  description: 'Открывай кейсы Возни: ешки, Telegram Gifts, Premium и джекпоты. Честные шансы.',
}

/**
 * Cases (App Redesign V1) — игровая поверхность как ПРИЛОЖЕНИЕ, не лендинг.
 * Тонкий title bar + плотная сетка компактных карточек (3+ кейса на экран).
 * Все детали (дроп-лист, описание, рулетка открытия) — в bottom-sheet карточки.
 * Экономика/RNG считаются в боте (open_case — единственный writer).
 */
export default async function CasesPage() {
  const rawCases = await getActiveCasesWithRewards()
  const cases = rawCases.map(buildCaseView).sort((a, b) => a.openCostAmount - b.openCostAmount)

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <ScreenHeader icon="📦" title="Кейсы" />

      <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
        {cases.length === 0 ? (
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
            <div className="mb-2 text-3xl">📦</div>
            <p className="text-sm text-muted-foreground">
              Активных кейсов пока нет. Загляни позже — скоро добавим.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              ← На главную
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <CaseCard key={c.itemCode} caseView={c} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
