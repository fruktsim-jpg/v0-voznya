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
import { prestigeForDivision } from '@/lib/ds/prestige'
import { DivisionBadge } from '@/components/prestige'
import { ScreenHeader } from '@/components/v2/screen-header'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Сезон | ВОЗНЯ',
  description:
    'Сезонный рейтинг ВОЗНИ: дивизионы, топ игроков по сезонному MMR и ' +
    'награды в конце сезона.',
}

/**
 * Season — rebuilt in the Settings visual language (visual reset). It used to be
 * the most decorative screen: emoji H1, per-tier gradient fills, blurred aura
 * blobs and glows. Now it reads as a native product screen — a thin ScreenHeader,
 * a max-w-2xl column, flat glass tiles. Division colour is kept ONLY as a subtle
 * accent (a thin border tint + the value colour), because here colour means
 * standing — not mood. Read-only over the bot DB.
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
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader
        icon="season"
        title="Сезон"
        kicker={
          active
            ? `${active.name} · осталось ${daysLeft} дн.`
            : 'Межсезонье'
        }
        accent="indigo"
      />

      <div className="mx-auto max-w-2xl px-4 pb-28 sm:px-6">
        {/* Личный блок — division colour as a thin accent, not a tier world. */}
        {myProfile && myProgress && (
          <section className="mt-1">
            {(() => {
              const myTier = prestigeForDivision(myProfile.division.name)
              return (
                <div
                  className="glass relative overflow-hidden rounded-2xl border border-border p-4 sm:p-5"
                  style={{ borderColor: `${myTier.color}40` }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(to right, ${myTier.color}80, transparent 70%)` }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Твой сезон
                      </div>
                      <div className="mt-1.5">
                        <DivisionBadge
                          emoji={myProfile.division.emoji}
                          name={myProfile.division.name}
                          size="lg"
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="type-stat text-2xl" style={{ color: myTier.color }}>
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
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round(myProgress.ratio * 100)}%`,
                            background: myTier.color,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-sm font-semibold" style={{ color: myTier.color }}>
                      Максимальный дивизион достигнут
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
              )
            })()}
          </section>
        )}

        {!session && (
          <section className="mt-1">
            <div className="glass rounded-2xl border border-border p-4 text-sm text-muted-foreground">
              Войди через Telegram, чтобы увидеть свой дивизион и место в сезоне.
            </div>
          </section>
        )}

        {/* Дивизионы — flat tiles, colour only as a meaning accent. */}
        <section className="mt-6">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Дивизионы
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DIVISIONS.map((d) => {
              const isMine = myProfile?.division.name === d.name
              const t = prestigeForDivision(d.name)
              return (
                <div
                  key={d.name}
                  className="rounded-2xl border bg-white/[0.02] p-3 text-center"
                  style={{ borderColor: isMine ? `${t.color}80` : 'var(--border)' }}
                >
                  <div className="text-2xl">{d.emoji}</div>
                  <div className="mt-1 text-sm font-bold" style={{ color: t.color }}>
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
                  {isMine && (
                    <div
                      className="mt-1.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: t.color }}
                    >
                      Твой дивизион
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Топ */}
        <section className="mt-6">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
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
                    <span className="type-stat text-sm text-primary">
                      {r.seasonMmr.toLocaleString('ru-RU')}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
