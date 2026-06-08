'use client'

import { useState, useTransition } from 'react'
import {
  startSeasonAction,
  finalizeSeasonAction,
  type SeasonActionResult,
} from './actions'
import type { FinalizeWinner } from '@/lib/season'

interface ActiveSeason {
  id: number
  name: string
  endsAt: string
  daysLeft: number
}

/**
 * Клиентская панель управления сезоном: старт нового / финал активного.
 * Финал необратим (раздаёт награды, закрывает сезон) — двойное подтверждение.
 */
export function SeasonManager({
  active,
  canManage,
}: {
  active: ActiveSeason | null
  canManage: boolean
}) {
  const [name, setName] = useState('Сезон 1')
  const [result, setResult] = useState<SeasonActionResult | null>(null)
  const [winners, setWinners] = useState<FinalizeWinner[] | null>(null)
  const [confirmFinal, setConfirmFinal] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleStart() {
    setResult(null)
    startTransition(async () => {
      const r = await startSeasonAction(name)
      setResult(r)
    })
  }

  function handleFinalize() {
    if (!confirmFinal) {
      setConfirmFinal(true)
      return
    }
    setConfirmFinal(false)
    setResult(null)
    setWinners(null)
    startTransition(async () => {
      const r = await finalizeSeasonAction()
      setResult(r)
      if (r.ok && r.winners) setWinners(r.winners)
    })
  }

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            result.ok
              ? 'border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200'
              : 'border-rose-400/30 bg-rose-400/[0.06] text-rose-200'
          }`}
        >
          {result.ok ? result.message : result.error}
        </div>
      )}

      {active ? (
        <div className="glass rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Текущий сезон
              </div>
              <div className="mt-0.5 text-lg font-bold text-foreground">
                {active.name}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  #{active.id}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {active.daysLeft}
              </div>
              <div className="text-xs text-muted-foreground">дней осталось</div>
            </div>
          </div>

          {canManage && (
            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Завершение сезона необратимо: всем из топа начисляются ешки по
                дивизиону и выдаются сезонные титулы, сезон закрывается.
              </p>
              <button
                onClick={handleFinalize}
                disabled={pending}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  confirmFinal
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'border border-rose-400/40 bg-rose-400/[0.08] text-rose-200 hover:bg-rose-400/[0.15]'
                } disabled:opacity-50`}
              >
                {pending
                  ? 'Завершаю…'
                  : confirmFinal
                    ? 'Точно завершить? Нажми ещё раз'
                    : '🏁 Завершить сезон'}
              </button>
              {confirmFinal && (
                <button
                  onClick={() => setConfirmFinal(false)}
                  className="ml-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-white/[0.04]"
                >
                  Отмена
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Сейчас межсезонье
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Активного сезона нет. Запусти новый — он продлится 56 дней.
          </p>
          {canManage && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название сезона"
                className="rounded-full border border-border bg-white/[0.04] px-4 py-2 text-sm text-foreground outline-none focus:border-primary/40"
              />
              <button
                onClick={handleStart}
                disabled={pending}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? 'Запускаю…' : '🚀 Запустить сезон'}
              </button>
            </div>
          )}
        </div>
      )}

      {!canManage && (
        <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-4 text-sm text-muted-foreground">
          Только просмотр. Управление сезоном доступно ролям с правом mmr.add.
        </div>
      )}

      {winners && winners.length > 0 && (
        <div className="glass overflow-hidden rounded-2xl border border-border">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            🏆 Награждённые ({winners.length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Игрок</th>
                <th className="px-3 py-2 font-semibold">Дивизион</th>
                <th className="px-3 py-2 text-right font-semibold">MMR</th>
                <th className="px-3 py-2 font-semibold">Титулы</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w) => (
                <tr
                  key={w.userId}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-3 py-2 text-muted-foreground">{w.rank}</td>
                  <td className="px-3 py-2 font-medium text-foreground">
                    id{w.userId}
                  </td>
                  <td className="px-3 py-2 text-foreground">{w.division}</td>
                  <td className="px-3 py-2 text-right text-primary">
                    {w.seasonMmr.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {w.titles.join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
