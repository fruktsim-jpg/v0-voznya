import Link from 'next/link'
import { getCasinoPulse, getCasinoSwings, getCasinoTopPlayers } from '@/lib/casino'
import { Section } from '@/components/v2/section'
import { Card } from '@/components/v2/card'
import { UserBadge } from '@/components/v2/user-badge'
import { EmptyState } from '@/components/v2/empty-state'
import { ScreenHeader } from '@/components/v2/screen-header'


export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Казино — Возня',
  description: 'Азартная часть Возни: что происходит сейчас, кто выигрывает и рискует.',
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Casino (V3, поверхность №6) — современный игровой раздел в стиле Возни
 * (Steam Activity / Faceit), НЕ гемблинг-помойка. Тёмный интерфейс, фиолетовые
 * акценты, минимализм. Отвечает на «что интересного в азартной части сейчас»:
 * пульс активности, крупные выигрыши и риски, топ игроков — всё на реальных
 * данных (transactions reason='casino'). Играть — только в боте. Read-only.
 * Не доминирует над профилями/достижениями/подарками — развлечение внутри
 * экосистемы.
 */
export default async function CasinoPage() {
  const [pulse, topWins, topRisks, leaders] = await Promise.all([
    getCasinoPulse(),
    getCasinoSwings('win', 6),
    getCasinoSwings('loss', 6),
    getCasinoTopPlayers(8),
  ])

  const hasActivity = pulse.spinsTotal > 0

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon="🎰" title="Казино" />

      <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
        {!hasActivity ? (
          <div className="mx-auto max-w-md">
            <EmptyState
              icon="🎰"
              title="Пока тихо"
              description="Ещё никто не делал ставок. Загляни позже — здесь появится азартная жизнь Возни."
            />
            <div className="mt-4 text-center">
              <Link href="/" className="text-sm font-medium text-primary hover:underline">
                ← На главную
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Пульс — статистика впереди */}
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <PulseStat icon="🎲" value={fmt(pulse.spins24h)} label="ставок за 24ч" accent />
              <PulseStat icon="👥" value={fmt(pulse.players24h)} label="игроков за 24ч" />
              <PulseStat
                icon="💥"
                value={pulse.biggestWin24h > 0 ? fmt(pulse.biggestWin24h) : '—'}
                label="макс. выигрыш 24ч"
              />
              <PulseStat
                icon="↩️"
                value={pulse.payoutRate != null ? `${Math.round(pulse.payoutRate * 100)}%` : '—'}
                label="возврат игрокам"
              />
            </div>

            <div className="lg:grid lg:grid-cols-3 lg:gap-6">
              {/* Левая колонка: выигрыши + риски */}
              <div className="space-y-6 lg:col-span-2">
                <Section title="🔥 Крупные выигрыши" subtitle="Кто сейчас в ударе · за неделю" className="!px-0">
                  {topWins.length === 0 ? (
                    <EmptyState icon="🎲" title="Пока нет крупных выигрышей" />
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {topWins.map((s, i) => (
                        <SwingCard key={`${s.userId}-${i}`} swing={s} dir="win" />
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="🎯 Крупные риски" subtitle="Кто играет по-крупному" className="!px-0">
                  {topRisks.length === 0 ? (
                    <EmptyState icon="🎲" title="Пока нет крупных ставок" />
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {topRisks.map((s, i) => (
                        <SwingCard key={`${s.userId}-${i}`} swing={s} dir="loss" />
                      ))}
                    </div>
                  )}
                </Section>
              </div>

              {/* Правая колонка: топ игроков */}
              <aside className="mt-6 lg:mt-0">
                <Section title="🏆 В плюсе за месяц" subtitle="Кто обыгрывает казино" className="!px-0">
                  {leaders.length === 0 ? (
                    <EmptyState icon="🏅" title="Пока никто не в плюсе" />
                  ) : (
                    <Card className="space-y-2">
                      {leaders.map((p) => (
                        <div key={p.userId} className="flex items-center gap-3">
                          <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground">
                            {p.rank}
                          </span>
                          <div className="min-w-0 flex-1">
                            <UserBadge name={p.userName} userId={p.userId} size="sm" />
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-emerald-300">
                            +{fmt(p.net)}
                          </span>
                        </div>
                      ))}
                    </Card>
                  )}
                </Section>

                {/* Контекст всего времени */}
                <Card className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Всего ставок</span>
                    <span className="font-semibold text-foreground">{fmt(pulse.spinsTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Рекордный выигрыш</span>
                    <span className="font-semibold text-amber-300">
                      {pulse.biggestWinAllTime > 0 ? fmt(pulse.biggestWinAllTime) : '—'}
                    </span>
                  </div>
                </Card>
              </aside>
            </div>
          </>
        )}

      </div>
    </main>
  )
}

function PulseStat({
  icon,
  value,
  label,
  accent = false,
}: {
  icon: string
  value: string
  label: string
  accent?: boolean
}) {
  return (
    <Card
      variant={accent ? 'epic' : 'default'}
      className="flex flex-col items-center gap-0.5 py-4 text-center"
    >
      <span className="text-lg" aria-hidden="true">{icon}</span>
      <span className="text-xl font-bold text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </Card>
  )
}

function SwingCard({
  swing,
  dir,
}: {
  swing: { userId: number; userName: string; net: number; bet: number; payout: number }
  dir: 'win' | 'loss'
}) {
  const isWin = dir === 'win'
  return (
    <Card className="flex items-center gap-3">
      <span className="text-xl" aria-hidden="true">{isWin ? '🔥' : '🎯'}</span>
      <div className="min-w-0 flex-1">
        <UserBadge name={swing.userName} userId={swing.userId} size="sm" />
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          ставка {fmt(swing.bet)} → {fmt(swing.payout)}
        </div>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold ${
          isWin ? 'text-emerald-300' : 'text-rose-300'
        }`}
      >
        {swing.net > 0 ? '+' : ''}
        {fmt(swing.net)}
      </span>
    </Card>
  )
}
