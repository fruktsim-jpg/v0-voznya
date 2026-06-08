import type { Metadata } from 'next'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import {
  getActiveSeason,
  getSeasonLeaderboard,
  getSeasonProfile,
  DIVISIONS,
  divisionProgress,
  TITLE_LABELS,
} from '@/lib/season'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Сезон | ВОЗНЯ',
  description:
    'Сезонный рейтинг ВОЗНИ: дивизионы, топ игроков по сезонному MMR и ' +
    'награды в конце сезона.',
}

/**
 * Публичная страница сезона (website-first). Показывает:
 * — карточку активного сезона (название, дни до конца);
 * — личный блок (MMR, дивизион, прогресс до следующего) для вошедшего игрока;
 * — лестницу дивизионов с наградами;
 * — топ по сезонному MMR с подсветкой себя.
 */
export default async function SeasonPage() {
  const session = await getSession()
  const [active, leaders, myProfile] = await Promise.all([
    getActiveSeason(),
    getSeasonLeaderboard(50),
    session ? getSeasonProfile(session.uid) : Promise.resolve(null),
  ])

  const daysLeft = active
    ? Math.max(
        0,
        Math.ceil(
          (new Date(active.endsAt).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : 0

  const myProgress = myProfile ? divisionProgress(myProfile.seasonMmr) : null

  return (
    <div className="mx-auto max-w-2xl px-4 pt-header pb-28">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">🏆 Сезон</h1>
        {active ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {active.name} · осталось{' '}
            <span className="font-semibold text-foreground">{daysLeft}</span>{' '}
            дней. По итогам — награды по дивизиону и сезонные титулы.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Сейчас межсезонье. Новый сезон скоро стартует.
          </p>
        )}
      </header>

      {/* Личный блок */}
      {myProfile && myProgress && (
        <section className="mb-8">
          <div className="glass rounded-3xl border border-primary/25 bg-primary/[0.05] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Твой сезон
                </div>
                <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <span>{myProfile.division.emoji}</span>
                  <span>{myProfile.division.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {myProfile.seasonMmr.toLocaleString('ru-RU')}
                </div>
                <div className="text-xs text-muted-foreground">
                  MMR{myProfile.rank ? ` · #${myProfile.rank}` : ''}
                </div>
              </div>
            </div>

            {myProgress.next ? (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>До {myProgress.next.name}</span>
                  <span>{myProgress.toNext.toLocaleString('ru-RU')} MMR</span>
                </div>
                <div className="h-2 rounded bg-white/[0.06]">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{ width: `${Math.round(myProgress.ratio * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-primary">
                Максимальный дивизион достигнут 🏅
              </div>
            )}

            {myProfile.titles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {myProfile.titles.map((code) => (
                  <span
                    key={code}
                    className="rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-2.5 py-1 text-xs font-medium text-amber-200"
                  >
                    {TITLE_LABELS[code] ?? code}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {!session && (
        <section className="mb-8">
          <div className="glass rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            Войди через Telegram, чтобы увидеть свой дивизион и место в сезоне.
          </div>
        </section>
      )}

      {/* Дивизионы */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Дивизионы
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DIVISIONS.map((d) => {
            const isMine = myProfile?.division.name === d.name
            return (
              <div
                key={d.name}
                className={`rounded-2xl border p-3 text-center ${
                  isMine
                    ? 'border-primary/40 bg-primary/[0.08]'
                    : 'border-border bg-white/[0.02]'
                }`}
              >
                <div className="text-2xl">{d.emoji}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {d.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {d.minMmr.toLocaleString('ru-RU')}+ MMR
                </div>
                <div className="mt-1 text-[11px] text-amber-200">
                  {d.rewardEshki > 0
                    ? `+${d.rewardEshki.toLocaleString('ru-RU')} ешек`
                    : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Топ */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Топ сезона
        </h2>
        {leaders.length === 0 ? (
          <div className="glass rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            Пока никто не набрал сезонный MMR. Ферми, открывай кейсы, бейся в
            дуэлях — и попадёшь в топ.
          </div>
        ) : (
          <div className="glass overflow-hidden rounded-2xl border border-border">
            {leaders.map((r, i) => {
              const isMe = session?.uid === r.userId
              return (
                <Link
                  key={r.userId}
                  href={`/profile/${r.userId}`}
                  className={`flex items-center gap-3 border-b border-border/50 px-4 py-3 transition last:border-0 hover:bg-white/[0.03] ${
                    isMe ? 'bg-primary/[0.06]' : ''
                  }`}
                >
                  <span
                    className={`w-6 text-center text-sm font-bold ${
                      i < 3 ? 'text-amber-300' : 'text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-lg">{r.division.emoji}</span>
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {r.name || (r.username ? `@${r.username}` : `id${r.userId}`)}
                    {isMe && (
                      <span className="ml-1 text-xs text-primary">(ты)</span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {r.seasonMmr.toLocaleString('ru-RU')}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
