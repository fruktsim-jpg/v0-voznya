import Link from 'next/link'
import { getActiveCasesWithRewards } from '@/lib/cases'
import { buildCaseView } from '@/lib/cases-ux'
import { getCommunityFeed } from '@/lib/feed'
import { CaseCard } from '@/components/v2/case-card'
import { DropTicker } from '@/components/v2/drop-ticker'
import { Section } from '@/components/v2/section'
import { UserBadge } from '@/components/v2/user-badge'
import { Card } from '@/components/v2/card'
import { PageHero } from '@/components/v2/page-hero'


export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Кейсы — Возня',
  description: 'Открывай кейсы Возни: ешки, Telegram Gifts, Premium и джекпоты. Честные шансы.',
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Cases (V3, поверхность №5) — ИГРОВАЯ механика открытия прямо на сайте.
 * Игрок видит линейку кейсов (от дешёвого к джекпоту), понимает ценность,
 * жмёт «Открыть» → CS-style рулетка → награда. Экономика и RNG считаются в
 * боте (open_case, единственный writer); сайт — основная точка взаимодействия.
 */
export default async function CasesPage() {
  const [rawCases, feed] = await Promise.all([
    getActiveCasesWithRewards(),
    getCommunityFeed(60),
  ])
  // Линейка читается как прогрессия: от самого дешёвого к джекпоту.
  const cases = rawCases
    .map(buildCaseView)
    .sort((a, b) => a.openCostAmount - b.openCostAmount)

  // Самый дорогой/желанный кейс — для подсказки новичку.
  const flagship = cases.length > 0 ? cases[cases.length - 1] : null


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
      <PageHero
        badge="Экономика · кейсы"
        icon="📦"
        title="Кейсы"
        accent="Возни"
        description={
          <>
            Трать ешки — лови <strong className="text-foreground">Telegram Gifts</strong>,{' '}
            <strong className="text-foreground">Premium</strong> и денежные джекпоты. Жми
            «Открыть» прямо здесь: крутится рулетка, награда зачисляется сразу. Шансы честные —
            из дроп-листа, каждое открытие в проверяемом логе.
          </>
        }
      />



      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Гид новичку: за 5 секунд понять линейку и где искать ценное. */}
        {cases.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="glass rounded-2xl border border-border p-3 text-center">
              <div className="text-xl">📦</div>
              <div className="mt-1 text-xs font-semibold text-foreground">{cases.length} кейса</div>
              <div className="text-[11px] text-muted-foreground">от дешёвого к топовому</div>
            </div>
            <div className="glass rounded-2xl border border-fuchsia-400/25 p-3 text-center">
              <div className="text-xl">🎁</div>
              <div className="mt-1 text-xs font-semibold text-fuchsia-200">Telegram Gifts</div>
              <div className="text-[11px] text-muted-foreground">реальные подарки</div>
            </div>
            <div className="glass rounded-2xl border border-amber-400/25 p-3 text-center">
              <div className="text-xl">⭐</div>
              <div className="mt-1 text-xs font-semibold text-amber-200">Premium 3 и 6 мес</div>
              <div className="text-[11px] text-muted-foreground">шанс в каждом кейсе</div>
            </div>
            <div className="glass rounded-2xl border border-amber-400/25 p-3 text-center">
              <div className="text-xl">💎</div>
              <div className="mt-1 text-xs font-semibold text-amber-200">
                {flagship ? flagship.name : 'Джекпот'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {flagship ? `топовый — ${fmt(flagship.openCostAmount)} ешек` : 'самый желанный'}
              </div>
            </div>
          </div>
        )}

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
                  <DropTicker events={recentDrops} />
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
