import Link from 'next/link'
import { getActiveCasesWithRewards } from '@/lib/cases'
import { buildCaseView } from '@/lib/cases-ux'
import { getCommunityFeed } from '@/lib/feed'
import { CaseCard } from '@/components/v2/case-card'
import { ActivityCard } from '@/components/v2/activity-card'
import { Section } from '@/components/v2/section'
import { UserBadge } from '@/components/v2/user-badge'
import { Card } from '@/components/v2/card'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Кейсы — Возня',
  description: 'Кейсы Возни: что внутри, насколько редко и ценно, кто что выбил.',
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Cases (V3, поверхность №5) — витрина кейсов с акцентом на ЦЕННОСТИ наград и
 * социальном доказательстве, не на открытии. Кейсы — часть экономики/статуса,
 * не отдельная игра. Реальные данные: getActiveCasesWithRewards + лента
 * (case_openings). Открытие — в боте (/кейсы). Read-only.
 */
export default async function CasesPage() {
  const [rawCases, feed] = await Promise.all([
    getActiveCasesWithRewards(),
    getCommunityFeed(60),
  ])
  const cases = rawCases.map(buildCaseView)

  // Социальное доказательство из реальной ленты.
  const caseEvents = feed.filter(
    (e) => e.code === 'CASE_OPEN' || e.code === 'CASE_JACKPOT' || e.code === 'CASE_GIFT_DROP',
  )
  const bestDrops = [...caseEvents]
    .filter((e) => e.rarity === 'epic' || e.rarity === 'legendary' || e.rarity === 'mythic')
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 5)
  const recentDrops = caseEvents.slice(0, 8)

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      {/* Hero */}
      <section className="relative px-6 pb-2 pt-20 text-center sm:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/20 blur-[120px]"
        />
        <div className="relative mx-auto max-w-2xl">
          <div className="mb-2 text-5xl">📦</div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Кейсы <span className="text-gradient">Возни</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Что внутри, насколько это редко и ценно. Честные шансы из дроп-листа.
            Открыть можно в боте командой{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5">/кейсы</code> — каждое
            открытие фиксируется в проверяемом логе.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {cases.length === 0 ? (
          <div className="glass mx-auto max-w-md rounded-3xl border border-border p-8 text-center">
            <div className="mb-2 text-3xl">📦</div>
            <p className="text-sm text-muted-foreground">
              Активных кейсов пока нет. Загляни позже — скоро добавим.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              ← На главную
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-3 lg:gap-6">
            {/* Витрина кейсов */}
            <div className="lg:col-span-2">
              <Section title="Активные кейсы" subtitle="Содержимое и ценность" className="!px-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {cases.map((c) => (
                    <CaseCard key={c.itemCode} caseView={c} />
                  ))}
                </div>
              </Section>
            </div>

            {/* Социальное доказательство */}
            <aside className="mt-6 space-y-6 lg:mt-0">
              {bestDrops.length > 0 && (
                <Section title="💎 Лучшие открытия" subtitle="Самое ценное за последнее время" className="!px-0">
                  <Card className="space-y-2">
                    {bestDrops.map((e) => (
                      <div key={e.id} className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden="true">{e.icon}</span>
                        <div className="min-w-0 flex-1">
                          <UserBadge name={e.actor.name} userId={e.actor.id} size="sm" />
                        </div>
                        {e.value != null && (
                          <span className="shrink-0 text-sm font-semibold text-amber-300">
                            {fmt(e.value)}
                          </span>
                        )}
                      </div>
                    ))}
                  </Card>
                </Section>
              )}

              {recentDrops.length > 0 && (
                <Section title="📦 Недавно открыли" subtitle="Кейсы реально открывают" className="!px-0">
                  <ul className="space-y-2">
                    {recentDrops.map((e) => (
                      <li key={e.id}>
                        <ActivityCard event={e} />
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </aside>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Шансы рассчитаны из весов дроп-листа. Лимитированные награды (джекпоты)
          имеют ограниченное число выпадений. Ценность награды зависит от её редкости.
        </p>
      </div>
    </main>
  )
}
