'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { rarityToken, type Rarity } from '@/lib/rarity'
import type { RewardView } from '@/lib/cases-ux'
import { notifyBalanceChanged } from '@/lib/balance-events'
import { ITEM_SELL_RATE } from '@/lib/economy-rules'


/**
 * CaseOpener — CS-style рулетка открытия кейса прямо на сайте.
 *
 * Открытие НЕ считается на клиенте: жмём «Открыть» → POST /api/cases/open →
 * сайт проверяет сессию и проксирует в бот (open_case — единственный writer:
 * CSPRNG, блокировки, списание ешек, выдача, pending-конвейер Gifts/Premium,
 * леджер). Сервер возвращает РЕАЛЬНУЮ награду. Только ПОСЛЕ ответа строится
 * лента: реальный приз вставляется в фиксированную позицию, лента доезжает до
 * него и центрируется под риской — победитель всегда честный, анимация лишь
 * визуализирует уже случившийся результат.
 *
 * Gift/Premium автоматически уходят в pending на стороне бота — ничего нового.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

// Геометрия ленты.
const CELL_W = 96 // ширина ячейки (px), синхронизировано с .reel-cell
const CELL_GAP = 8
const STRIDE = CELL_W + CELL_GAP
const REEL_LEN = 60 // сколько ячеек в ленте
const WIN_INDEX = 50 // на какой позиции стоит реальный приз
const SPIN_MS = 5200 // длительность прокрутки

type OpenResponse = {
  status?: string
  caseName?: string
  rewardKind?: string
  rewardItemCode?: string | null
  rewardItemName?: string | null
  rewardRarity?: string | null
  amount?: number | null
  qty?: number
  isJackpot?: boolean
  balance?: number | null
  deliveryKey?: string | null
  starCost?: number | null
  error?: string
}

type Cell = {
  rarity: Rarity
  icon: string
  label: string
}

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

function normalizeRarity(r: string | null | undefined): Rarity {
  const v = (r ?? '').toLowerCase()
  return (RARITY_ORDER as string[]).includes(v) ? (v as Rarity) : 'common'
}

function kindIcon(kind: string, isJackpot: boolean): string {
  if (kind === 'tg_gift') return '🎁'
  if (kind === 'currency') return isJackpot ? '💎' : '💰'
  return '🎖️'
}

/** Человеческое сообщение по статусу/ошибке открытия. */
function failureMessage(httpStatus: number, data: OpenResponse): string {
  if (httpStatus === 401) return 'Войди через Telegram, чтобы открывать кейсы.'
  if (
    data.error === 'cases_open_unavailable' ||
    data.error === 'bot_unreachable' ||
    httpStatus === 503 ||
    httpStatus === 502
  )
    return 'Открытие временно недоступно. Попробуй ещё раз через пару секунд.'
  switch (data.status) {
    case 'not_enough':
      return 'Не хватает ешек на этот кейс.'
    case 'inactive':
      return 'Кейс сейчас недоступен.'
    case 'no_key':
      return 'Нужен ключ для этого кейса.'
    case 'not_found':
      return 'Кейс не найден.'
    default:
      return 'Не получилось открыть кейс. Попробуй позже.'
  }

}

type Won = {
  kind: string
  rarity: Rarity
  icon: string
  title: string
  subtitle: string
  isJackpot: boolean
  isPremium: boolean
  starCost: number | null
  balance: number | null
  // Для tg_gift — ключ pending-доставки и сумма продажи (P1: оставить/продать/вывести).
  deliveryKey: string | null
  sellAmount: number | null
}


/** Ответ сервера → карточка выигрыша. */
function toWon(data: OpenResponse): Won {
  const kind = data.rewardKind ?? 'currency'
  const isJackpot = Boolean(data.isJackpot)
  const isPremium = kind === 'tg_gift' && /premium/i.test(data.rewardItemCode ?? '')
  if (kind === 'currency') {
    const amount = data.amount ?? 0
    return {
      kind,
      rarity: isJackpot
        ? 'legendary'
        : amount >= 10000 ? 'legendary' : amount >= 3000 ? 'epic' : amount >= 800 ? 'rare' : amount >= 200 ? 'uncommon' : 'common',
      icon: isJackpot ? '💎' : '💰',
      title: `${fmt(amount)} ешек`,
      subtitle: data.balance != null ? `Баланс: ${fmt(data.balance)}` : '',
      isJackpot,
      isPremium: false,
      starCost: null,
      balance: data.balance ?? null,
      deliveryKey: null,
      sellAmount: null,
    }
  }
  if (kind === 'tg_gift') {
    // Внутренняя стоимость в ешках = starCost × 10 (ESHKI_PER_STAR); сумма
    // продажи = floor(value × ITEM_SELL_RATE). Совпадает с расчётом бота.
    const value = data.starCost != null ? data.starCost * 10 : null
    const sellAmount = value != null ? Math.floor(value * ITEM_SELL_RATE) : null
    return {
      kind,
      rarity: isJackpot || isPremium ? 'mythic' : 'legendary',
      icon: '🎁',
      title: data.rewardItemName ?? data.rewardItemCode ?? 'Подарок',
      subtitle: '🎁 Подарок в инвентаре — реши его судьбу ниже.',
      isJackpot,
      isPremium,
      starCost: data.starCost ?? null,
      balance: data.balance ?? null,
      deliveryKey: data.deliveryKey ?? null,
      sellAmount,
    }
  }
  const qty = data.qty && data.qty > 1 ? ` ×${data.qty}` : ''
  return {
    kind,
    rarity: normalizeRarity(data.rewardRarity),
    icon: '🎖️',
    title: `${data.rewardItemName ?? data.rewardItemCode ?? 'Предмет'}${qty}`,
    subtitle: '',
    isJackpot,
    isPremium: false,
    starCost: null,
    balance: data.balance ?? null,
    deliveryKey: null,
    sellAmount: null,
  }
}


type Phase = 'idle' | 'spinning' | 'revealed' | 'error'

type ChoiceState = 'idle' | 'selling' | 'withdrawing' | 'sold' | 'withdrawn' | 'error'

/**
 * GiftChoice — экран решения судьбы выпавшего подарка прямо в результате
 * открытия (P1): Оставить (предмет уже в инвентаре) / Продать за N (мгновенно
 * +ешки) / Вывести (заявка на реальную выдачу). Зеркалит ботовый экран выбора.
 * Действия бьют в те же серверные ручки, что и страница инвентаря.
 */
function GiftChoice({ won }: { won: Won }) {
  const [state, setState] = useState<ChoiceState>('idle')
  const [msg, setMsg] = useState('')
  const busy = state === 'selling' || state === 'withdrawing'
  const done = state === 'sold' || state === 'withdrawn'

  if (!won.deliveryKey) return null

  async function call(path: string, optimistic: ChoiceState) {
    if (busy) return
    setState(optimistic)
    setMsg('')
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryKey: won.deliveryKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.status === 'ok') {
        if (optimistic === 'selling') {
          setState('sold')
          setMsg(`Продано +${fmt(data.amount ?? won.sellAmount ?? 0)} 🥚`)
          notifyBalanceChanged()
        } else {
          setState('withdrawn')
          setMsg(won.isPremium ? '⭐ Заявка на Premium создана.' : '✅ В очереди на выдачу.')
        }
        return
      }
      setState('error')
      setMsg('Не получилось. Открой раздел «Инвентарь».')
    } catch {
      setState('error')
      setMsg('Сеть недоступна.')
    }
  }

  if (done) {
    return <p className="mt-2 text-center text-xs font-semibold text-emerald-300">{msg}</p>
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        <a
          href="/inventory"
          className="rounded-lg border border-white/15 bg-white/5 py-2 text-center text-xs font-bold text-foreground transition hover:bg-white/10"
        >
          Оставить
        </a>
        <button
          onClick={() => call('/api/inventory/sell', 'selling')}
          disabled={busy || won.sellAmount == null}
          className="rounded-lg border border-amber-400/50 bg-amber-400/10 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-50"
        >
          {state === 'selling' ? '…' : won.sellAmount != null ? `Продать ${fmt(won.sellAmount)}` : 'Продать'}
        </button>
        <button
          onClick={() => call('/api/inventory/withdraw', 'withdrawing')}
          disabled={busy}
          className="rounded-lg border border-primary/50 bg-primary/10 py-2 text-xs font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
        >
          {state === 'withdrawing' ? '…' : won.isPremium ? 'Активировать' : 'Вывести'}
        </button>
      </div>
      {state === 'error' && <p className="text-center text-[11px] text-red-300">{msg}</p>}
    </div>
  )
}


export function CaseOpener({
  caseItemCode,
  costLabel,
  rewards,
}: {
  caseItemCode: string
  costLabel: string
  /** Реальный пул наград кейса — из него строится лента. */
  rewards: RewardView[]
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [won, setWon] = useState<Won | null>(null)
  const [error, setError] = useState<string>('')
  const [reel, setReel] = useState<Cell[]>([])
  const [offset, setOffset] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const busy = useRef(false)

  // Пул ячеек для «наполнения» ленты — из реальных наград (вес → частота).
  const pool = useMemo<Cell[]>(() => {
    const cells: Cell[] = []
    for (const r of rewards) {
      cells.push({
        rarity: r.rarity,
        icon: kindIcon(r.rewardKind, r.isJackpot),
        label: r.label,
      })
    }
    return cells.length > 0 ? cells : [{ rarity: 'common', icon: '📦', label: '—' }]
  }, [rewards])

  const buildReel = useCallback(
    (winCell: Cell): Cell[] => {
      const arr: Cell[] = []
      for (let i = 0; i < REEL_LEN; i++) {
        if (i === WIN_INDEX) arr.push(winCell)
        else arr.push(pool[Math.floor(Math.random() * pool.length)])
      }
      return arr
    },
    [pool],
  )

  const open = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setPhase('spinning')
    setWon(null)
    setError('')
    setSpinning(false)
    setOffset(0)

    try {
      const res = await fetch('/api/cases/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseItemCode }),
      })
      const data: OpenResponse = await res.json().catch(() => ({}))

      if (!res.ok || data.status !== 'ok') {
        setError(failureMessage(res.status, data))
        setPhase('error')
        busy.current = false
        return
      }

      // Баланс мог измениться (списание стоимости + валютная награда) — обновляем
      // чип в шапке сразу, без F5 (P5). Анимация крутится, число уже актуально.
      notifyBalanceChanged()

      const w = toWon(data)
      const winCell: Cell = { rarity: w.rarity, icon: w.icon, label: w.title }
      const newReel = buildReel(winCell)
      setReel(newReel)


      // Центрируем WIN_INDEX под риской. Контейнер центрируется через CSS
      // (риска по центру), поэтому конечный сдвиг = позиция ячейки минус
      // половина контейнера + половина ячейки. Половину контейнера компенсируем
      // через translateX контейнера-обёртки (left:50%). Небольшой джиттер,
      // чтобы лента не всегда замирала строго по центру (живее).
      const jitter = Math.floor((Math.random() - 0.5) * (CELL_W * 0.5))
      const target = WIN_INDEX * STRIDE + CELL_W / 2 + jitter

      // Старт прокрутки в следующий кадр (чтобы сработал transition).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSpinning(true)
          setOffset(target)
        })
      })

      // По окончании анимации — экран результата.
      window.setTimeout(() => {
        setWon(w)
        setPhase('revealed')
        busy.current = false
      }, SPIN_MS + 150)
    } catch {
      setError('Сеть недоступна. Попробуй ещё раз.')
      setPhase('error')
      busy.current = false
    }
  }, [caseItemCode, buildReel])

  // ---- РЕЗУЛЬТАТ ----
  if (phase === 'revealed' && won) {
    const t = rarityToken(won.rarity)
    const special = won.isJackpot || won.isPremium
    return (
      <div className="mt-3">
        <div
          className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-5 text-center"
          style={{ borderColor: t.color, boxShadow: t.glow || undefined, background: `radial-gradient(circle at 50% 0%, ${t.color}22, transparent 70%)` }}
        >
          {special && (
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }} />
          )}
          {/* Салют частиц для джекпота/Premium — событие, а не просто строка. */}
          {special && (
            <span className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
              {Array.from({ length: 14 }).map((_, i) => {
                const angle = (360 / 14) * i
                const dist = 60 + (i % 3) * 18
                const dx = Math.cos((angle * Math.PI) / 180) * dist
                const dy = Math.sin((angle * Math.PI) / 180) * dist
                return (
                  <span
                    key={i}
                    className="absolute left-1/2 top-8 h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: t.color,
                      animation: `caseBurst 900ms ease-out forwards`,
                      '--dx': `${dx}px`,
                      '--dy': `${dy}px`,
                    } as Record<string, string>}
                  />


                )
              })}
            </span>
          )}
          <style>{`@keyframes caseBurst{0%{transform:translate(-50%,0) scale(1);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),var(--dy)) scale(0);opacity:0}}`}</style>

          {won.isJackpot && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 animate-pulse">
              💎 ДЖЕКПОТ
            </span>
          )}
          {won.isPremium && !won.isJackpot && (
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: t.color }}>
              ⭐ TELEGRAM PREMIUM
            </span>
          )}
          <span className={`text-4xl ${special ? 'animate-bounce' : ''}`} aria-hidden="true">
            {won.icon}
          </span>
          <span className="text-xl font-extrabold" style={{ color: t.color }}>
            {won.title}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.color }}>
            {rarityToken(won.rarity).label}
          </span>
          {won.starCost != null && won.starCost > 0 && (
            <span className="text-xs text-amber-200">Ценность: {fmt(won.starCost)} ⭐</span>
          )}
          {won.subtitle && (
            <span className="mt-0.5 text-xs text-muted-foreground">{won.subtitle}</span>
          )}
        </div>
        {/* Для подарка/Premium — экран выбора судьбы (P1): Оставить/Продать/Вывести. */}
        {won.kind === 'tg_gift' && won.deliveryKey && <GiftChoice won={won} />}
        <button
          onClick={open}
          className="mt-2 w-full rounded-xl border border-primary/50 bg-primary/10 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20"
        >
          Открыть ещё ({costLabel})
        </button>
      </div>
    )
  }


  // ---- РУЛЕТКА (спин) ----
  if (phase === 'spinning') {
    return (
      <div className="mt-3">
        <div className="relative h-[88px] overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {/* Затемнение по краям */}
          <div className="pointer-events-none absolute inset-0 z-20" style={{
            background: 'linear-gradient(90deg, rgba(0,0,0,0.85), transparent 18%, transparent 82%, rgba(0,0,0,0.85))',
          }} />
          {/* Центральная риска-указатель */}
          <span className="pointer-events-none absolute left-1/2 top-0 z-30 h-full w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_10px_2px_rgba(245,209,66,0.7)]" />
          <span className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-amber-300" />
          <span className="pointer-events-none absolute bottom-0 left-1/2 z-30 -translate-x-1/2 border-x-[6px] border-b-[8px] border-x-transparent border-b-amber-300" />

          {/* Лента: контейнер сдвинут на left:50% (центр = риска), ячейки едут влево */}
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2">
            <div
              className="flex"
              style={{
                gap: `${CELL_GAP}px`,
                transform: `translateX(-${offset}px)`,
                transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.66, 0.12, 1)` : 'none',
              }}
            >
              {reel.map((cell, i) => {
                const t = rarityToken(cell.rarity)
                return (
                  <div
                    key={i}
                    className="reel-cell flex flex-col items-center justify-center rounded-lg border"
                    style={{
                      width: CELL_W,
                      height: 72,
                      flex: '0 0 auto',
                      borderColor: `${t.color}88`,
                      background: `linear-gradient(180deg, ${t.color}22, transparent)`,
                      borderTop: `3px solid ${t.color}`,
                    }}
                  >
                    <span className="text-2xl" aria-hidden="true">{cell.icon}</span>
                    <span className="mt-0.5 w-full truncate px-1 text-center text-[9px] text-muted-foreground">
                      {cell.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Крутим…</p>
      </div>
    )
  }

  // ---- IDLE / ERROR ----
  return (
    <div className="mt-3">
      <button
        onClick={open}
        className="w-full rounded-xl border border-primary/50 bg-primary/10 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20"
      >
        Открыть кейс ({costLabel})
      </button>
      {phase === 'error' && (
        <p className="mt-2 text-center text-xs text-red-300">{error}</p>
      )}
    </div>
  )
}
