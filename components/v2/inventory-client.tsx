'use client'

import { useState } from 'react'
import { rarityToken, type Rarity } from '@/lib/rarity'
import { rarityStyle, typeEmoji } from '@/lib/inventory'
import { notifyBalanceChanged } from '@/lib/balance-events'
import type { InventoryItem, InventoryGiftItem } from '@/lib/inventory-list'

/**
 * InventoryClient (VOZNYA 2.2) — инвентарь как Steam-style сетка.
 *
 * Предметы — полноценные игровые объекты. Для подарков/Premium игрок прямо тут
 * решает судьбу. UX-проход на понятность (Release 2.2): четыре действия с
 * однозначными формулировками + защита от случайной потери.
 *
 *   💰 Продать за X      — мгновенно за ешки (с подтверждением «Точно?»).
 *   📤 Вывести себе      — реальный подарок ТЕБЕ в Telegram.
 *   🎁 Отправить другу   — реальный подарок другому человеку: по @username
 *                          (если он знаком боту) ИЛИ по ссылке (кому угодно).
 *   🤝 Передать в Возне  — отдать предмет другому игроку ВНУТРИ игры (без TG).
 *
 * Каждое действие меняет тот же серверный стейт, что и бот, и дёргает
 * notifyBalanceChanged() — баланс в шапке обновляется без F5 (P5).
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

type ActionState =
  | 'idle'
  | 'selling'
  | 'withdrawing'
  | 'gifting'
  | 'transferring'
  | 'sold'
  | 'withdrawn'
  | 'gifted'
  | 'transferred'
  | 'error'

// Что раскрыто под карточкой:
//   none     — обычная сетка из 4 действий;
//   send     — «Отправить другу»: ввод @username ИЛИ ссылка (кому угодно);
//   transfer — «Передать в Возне»: внутренняя передача игроку.
type Panel = 'none' | 'send' | 'transfer'

function GiftCard({
  item,
  onConsumed,
}: {
  item: InventoryGiftItem
  onConsumed: (deliveryKey: string) => void
}) {
  const [state, setState] = useState<ActionState>('idle')
  const [msg, setMsg] = useState<string>('')
  const [panel, setPanel] = useState<Panel>('none')
  const [recipient, setRecipient] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  // Подтверждение продажи: первый клик показывает «Точно?», второй — продаёт.
  // Защищает от случайной потери предмета (продажа необратима).
  const [confirmSell, setConfirmSell] = useState(false)

  const t = rarityToken(item.rarity as Rarity)
  const busy =
    state === 'selling' ||
    state === 'withdrawing' ||
    state === 'gifting' ||
    state === 'transferring'

  function resetPanels() {
    setPanel('none')
    setRecipient('')
    setLinkUrl('')
    setConfirmSell(false)
    setState('idle')
    setMsg('')
  }

  // 🎁 «Отправить другу» по @username — РЕАЛЬНАЯ Telegram-доставка получателю.
  async function gift() {
    const to = recipient.trim()
    if (busy || !to) return
    setState('gifting')
    setMsg('')
    try {
      const res = await fetch('/api/inventory/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryKey: item.deliveryKey, recipient: to }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok || res.status === 202) {
        if (data.status === 'delivered') {
          setState('gifted')
          setMsg(`🎁 Подарок отправлен ${to} в Telegram!`)
          window.setTimeout(() => onConsumed(item.deliveryKey), 1500)
          return
        }
        if (data.status === 'pending' || data.status === 'queued') {
          setState('gifted')
          setMsg('⏳ В очереди — подарок уйдёт другу чуть позже.')
          return
        }
        if (data.status === 'cancelled') {
          setState('gifted')
          setMsg(data.refunded ? '↩️ Не вышло — ешки возвращены.' : 'Отменено.')
          notifyBalanceChanged()
          window.setTimeout(() => onConsumed(item.deliveryKey), 1500)
          return
        }
      }
      setState('error')
      // Если получатель не знаком боту — подсказываем путь «по ссылке».
      setMsg(
        data.status === 'recipient_not_found'
          ? 'Этот человек не запускал бота. Отправь ему ссылку ниже 👇'
          : data.status === 'self_transfer'
            ? 'Нельзя подарить самому себе.'
            : data.status === 'not_pending'
              ? 'Предмет уже обработан.'
              : data.status === 'unreachable'
                ? 'Сервис выдачи недоступен, попробуй позже.'
                : 'Не получилось отправить.',
      )
    } catch {
      setState('error')
      setMsg('Сеть недоступна.')
    }
  }

  // 🤝 «Передать в Возне» — внутренняя передача предмета игроку (без Telegram).
  async function transfer() {
    const to = recipient.trim()
    if (busy || !to) return
    setState('transferring')
    setMsg('')
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryKey: item.deliveryKey, recipient: to }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.status === 'ok') {
        setState('transferred')
        const who = data.recipientUsername ? `@${data.recipientUsername}` : to
        setMsg(`🤝 Передано игроку ${who}`)
        window.setTimeout(() => onConsumed(item.deliveryKey), 1500)
        return
      }
      setState('error')
      setMsg(
        data.status === 'recipient_not_found'
          ? 'Игрок не найден в Возне.'
          : data.status === 'self_transfer'
            ? 'Нельзя передать самому себе.'
            : data.status === 'not_pending'
              ? 'Предмет уже обработан.'
              : 'Не получилось передать.',
      )
    } catch {
      setState('error')
      setMsg('Сеть недоступна.')
    }
  }

  // Ссылка «кому угодно»: даже если получатель НЕ запускал бота — он откроет
  // ссылку и заберёт подарок. Создаётся внутри панели «Отправить другу».
  async function makeLink() {
    if (busy || linkUrl) return
    setState('gifting')
    setMsg('')
    try {
      const res = await fetch('/api/inventory/gift-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryKey: item.deliveryKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.status === 'ok' && data.url) {
        setState('idle')
        setLinkUrl(data.url as string)
        return
      }
      setState('error')
      setMsg(
        data.error === 'bot_username_not_configured'
          ? 'Ссылки временно недоступны.'
          : data.status === 'not_pending'
            ? 'Предмет уже обработан.'
            : 'Не получилось создать ссылку.',
      )
    } catch {
      setState('error')
      setMsg('Сеть недоступна.')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(linkUrl)
      setMsg('🔗 Ссылка скопирована!')
    } catch {
      setMsg('Скопируй ссылку вручную.')
    }
  }

  // «Отправить в Telegram» — нативный выбор чата с готовым текстом. Получатель
  // тапает ссылку → бот узнаёт его user_id → выдаёт подарок. Способ «кому
  // угодно» одним нажатием (резолва @username у бота нет — клик делает сам
  // получатель).
  function shareToTelegram() {
    const text = `🎁 Лови подарок: ${item.name}! Жми, чтобы забрать в Telegram.`
    const share = `https://t.me/share/url?url=${encodeURIComponent(linkUrl)}&text=${encodeURIComponent(text)}`
    window.open(share, '_blank', 'noopener,noreferrer')
  }

  // 💰 Продажа: первый клик ставит подтверждение, второй — продаёт (необратимо).
  async function sell() {
    if (busy) return
    if (!confirmSell) {
      setConfirmSell(true)
      return
    }
    setConfirmSell(false)
    setState('selling')
    setMsg('')
    try {
      const res = await fetch('/api/inventory/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryKey: item.deliveryKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.status === 'ok') {
        setState('sold')
        setMsg(`+${fmt(data.amount ?? item.sellAmount)} 🥚`)
        notifyBalanceChanged()
        window.setTimeout(() => onConsumed(item.deliveryKey), 1200)
        return
      }
      setState('error')
      setMsg(
        data.status === 'not_pending'
          ? 'Предмет уже обработан.'
          : data.status === 'no_value'
            ? 'Стоимость неизвестна.'
            : 'Не получилось продать.',
      )
    } catch {
      setState('error')
      setMsg('Сеть недоступна.')
    }
  }

  // 📤 «Вывести себе» — реальный подарок игроку в Telegram (авто-выдача).
  async function withdraw() {
    if (busy) return
    setState('withdrawing')
    setMsg('')
    try {
      const res = await fetch('/api/inventory/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryKey: item.deliveryKey }),
      })
      const data = await res.json().catch(() => ({}))
      // Авто-выдача — основной путь (Release 2.2):
      //   delivered — выдан сразу → убираем из активного инвентаря;
      //   cancelled — постоянная ошибка + возврат → тоже убираем (вернулись ешки);
      //   pending/queued — выдаст фоновый воркер, оставляем с пометкой.
      if (res.ok || res.status === 202) {
        if (data.status === 'delivered') {
          setState('withdrawn')
          setMsg(item.isPremium ? '⭐ Premium активирован!' : '✅ Подарок пришёл в Telegram!')
          window.setTimeout(() => onConsumed(item.deliveryKey), 1200)
          return
        }
        if (data.status === 'cancelled') {
          setState('withdrawn')
          setMsg(data.refunded ? '↩️ Выдать не вышло — ешки возвращены.' : 'Отменено.')
          notifyBalanceChanged()
          window.setTimeout(() => onConsumed(item.deliveryKey), 1500)
          return
        }
        if (data.status === 'pending' || data.status === 'queued') {
          setState('withdrawn')
          setMsg('⏳ В очереди на выдачу — придёт в Telegram.')
          return
        }
      }
      setState('error')
      setMsg(data.status === 'not_pending' ? 'Предмет уже обработан.' : 'Не получилось.')
    } catch {
      setState('error')
      setMsg('Сеть недоступна.')
    }
  }

  const done =
    state === 'sold' ||
    state === 'withdrawn' ||
    state === 'gifted' ||
    state === 'transferred'

  // Подпись действия «Вывести/Активировать» зависит от типа предмета.
  const withdrawLabel = item.isPremium ? '⭐ Активировать себе' : '📤 Вывести себе'

  return (
    <div
      className="relative flex flex-col gap-2 rounded-2xl border p-3"
      style={{
        borderColor: t.color,
        boxShadow: t.glow || undefined,
        background: `radial-gradient(circle at 50% 0%, ${t.color}1a, transparent 70%)`,
        opacity: done ? 0.7 : 1,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-3xl" aria-hidden="true">{item.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold" style={{ color: t.color }}>
            {item.name}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.color }}>
            {item.isPremium ? '⭐ Telegram Premium' : rarityToken(item.rarity as Rarity).label}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Ценность: {fmt(item.value)} 🥚 · {item.source === 'case' ? 'из кейса' : 'из магазина'}
          </p>
        </div>
      </div>

      {!done ? (
        <div className="flex flex-col gap-1.5">
          {panel === 'none' ? (
            <>
              {/* Главные действия с собой: забрать в Telegram или продать. */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={withdraw}
                  disabled={busy}
                  className="rounded-lg border border-primary/50 bg-primary/10 py-2 text-xs font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                >
                  {state === 'withdrawing' ? '…' : withdrawLabel}
                </button>
                {!confirmSell ? (
                  <button
                    onClick={sell}
                    disabled={busy}
                    className="rounded-lg border border-amber-400/50 bg-amber-400/10 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-50"
                  >
                    {state === 'selling' ? '…' : `💰 Продать за ${fmt(item.sellAmount)}`}
                  </button>
                ) : (
                  // Подтверждение продажи: предмет исчезнет навсегда.
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={sell}
                      disabled={busy}
                      className="rounded-lg border border-amber-400/70 bg-amber-400/25 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-400/35 disabled:opacity-50"
                    >
                      Продать ✓
                    </button>
                    <button
                      onClick={() => setConfirmSell(false)}
                      className="rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-bold text-muted-foreground transition hover:bg-white/10"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
              {/* Отдать другому: реальный подарок в Telegram ИЛИ внутри Возни. */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { resetPanels(); setPanel('send') }}
                  disabled={busy}
                  className="rounded-lg border border-sky-400/40 bg-sky-400/10 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-400/20 disabled:opacity-50"
                >
                  🎁 Отправить другу
                </button>
                <button
                  onClick={() => { resetPanels(); setPanel('transfer') }}
                  disabled={busy}
                  className="rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-bold text-foreground transition hover:bg-white/10 disabled:opacity-50"
                >
                  🤝 Передать в Возне
                </button>
              </div>
              {confirmSell && (
                <p className="text-center text-[11px] text-amber-200/80">
                  Продажа необратима — предмет исчезнет за ешки.
                </p>
              )}
            </>
          ) : panel === 'send' ? (
            // 🎁 Отправить другу — настоящий Telegram-подарок другому человеку.
            <div className="flex flex-col gap-1.5">
              <p className="px-0.5 text-[11px] text-muted-foreground">
                Настоящий подарок в Telegram другому человеку. Знаешь его @username
                — впиши; не запускал бота — отправь ссылку ниже.
              </p>
              <div className="flex gap-1.5">
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && gift()}
                  placeholder="@username или ID"
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs text-foreground outline-none focus:border-sky-400/50"
                />
                <button
                  onClick={gift}
                  disabled={busy || !recipient.trim()}
                  className="rounded-lg border border-sky-400/50 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-400/20 disabled:opacity-50"
                >
                  {state === 'gifting' ? '…' : 'Отправить'}
                </button>
              </div>

              {/* Способ «кому угодно»: ссылка-приглашение забрать подарок. */}
              {!linkUrl ? (
                <button
                  onClick={makeLink}
                  disabled={busy}
                  className="rounded-lg border border-sky-400/30 bg-sky-400/5 py-2 text-[11px] font-semibold text-sky-300 transition hover:bg-sky-400/15 disabled:opacity-50"
                >
                  {state === 'gifting' ? 'Создаю ссылку…' : '🔗 Получить ссылку (для любого)'}
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={shareToTelegram}
                    className="rounded-lg border border-sky-400/60 bg-sky-400/20 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-400/30"
                  >
                    ✈️ Отправить ссылку в Telegram
                  </button>
                  <div className="flex gap-1.5">
                    <input
                      readOnly
                      value={linkUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-[11px] text-foreground outline-none"
                    />
                    <button
                      onClick={copyLink}
                      className="rounded-lg border border-sky-400/50 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-400/20"
                    >
                      Копировать
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={resetPanels}
                className="self-start rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-white/10"
              >
                ← назад
              </button>
              {msg && (
                <p className={`text-center text-[11px] ${state === 'error' ? 'text-red-300' : 'text-sky-300'}`}>
                  {msg}
                </p>
              )}
            </div>
          ) : (
            // 🤝 Передать в Возне — внутренняя передача предмета игроку (без TG).
            <div className="flex flex-col gap-1.5">
              <p className="px-0.5 text-[11px] text-muted-foreground">
                Отдать предмет другому игроку ВНУТРИ Возни. Он окажется в его
                инвентаре — без отправки в Telegram.
              </p>
              <div className="flex gap-1.5">
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && transfer()}
                  placeholder="@username или ID игрока"
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                />
                <button
                  onClick={transfer}
                  disabled={busy || !recipient.trim()}
                  className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-50"
                >
                  {state === 'transferring' ? '…' : 'Передать'}
                </button>
              </div>
              <button
                onClick={resetPanels}
                className="self-start rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-white/10"
              >
                ← назад
              </button>
              {msg && (
                <p className={`text-center text-[11px] ${state === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                  {msg}
                </p>
              )}
            </div>
          )}
          {panel === 'none' && state === 'error' && (
            <p className="text-center text-[11px] text-red-300">{msg}</p>
          )}
        </div>
      ) : (
        <p className="text-center text-xs font-semibold text-emerald-300">
          {state === 'sold' ? `Продано ${msg}` : msg}
        </p>
      )}
    </div>
  )
}

function StackCard({ item }: { item: Extract<InventoryItem, { kind: 'stack' }> }) {
  const style = rarityStyle(item.rarity)
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-3 ${style.className}`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl" aria-hidden="true">{typeEmoji(item.type)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
          <p className="text-[11px] text-muted-foreground">{style.label}</p>
        </div>
        {item.quantity > 1 && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-foreground">
            ×{item.quantity}
          </span>
        )}
      </div>
      {item.equipped && (
        <span className="self-start rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          надето
        </span>
      )}
      {item.description && (
        <p className="line-clamp-2 text-[11px] text-muted-foreground">{item.description}</p>
      )}
    </div>
  )
}

export function InventoryClient({ initial }: { initial: InventoryItem[] }) {
  const [items, setItems] = useState<InventoryItem[]>(initial)

  const removeGift = (deliveryKey: string) =>
    setItems((prev) =>
      prev.filter((i) => !(i.kind === 'gift' && i.deliveryKey === deliveryKey)),
    )

  const gifts = items.filter((i): i is InventoryGiftItem => i.kind === 'gift')
  const stacks = items.filter((i) => i.kind === 'stack')

  if (items.length === 0) {
    return (
      <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
        <div className="mb-2 text-3xl">🎒</div>
        <p className="text-sm text-muted-foreground">
          Инвентарь пуст. Открывай кейсы и покупай в магазине — всё попадёт сюда.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {gifts.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-bold text-foreground">
            🎁 Подарки и Premium <span className="text-muted-foreground">({gifts.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gifts.map((g) => (
              <GiftCard key={g.deliveryKey} item={g} onConsumed={removeGift} />
            ))}
          </div>
        </section>
      )}

      {stacks.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-bold text-foreground">
            ✨ Предметы <span className="text-muted-foreground">({stacks.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {stacks.map((s) =>
              s.kind === 'stack' ? <StackCard key={s.itemCode} item={s} /> : null,
            )}
          </div>
        </section>
      )}
    </div>
  )
}
