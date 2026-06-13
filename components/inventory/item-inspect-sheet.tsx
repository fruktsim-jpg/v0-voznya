'use client'

import { useState } from 'react'
import { Drawer } from 'vaul'
import { rarityToken } from '@/lib/rarity'
import { notifyBalanceChanged } from '@/lib/balance-events'
import { sellGift, withdrawGift } from '@/lib/gift-delivery'
import type { InventoryGiftItem } from '@/lib/inventory-list'
import type { InvItem } from '@/lib/inventory-meta'
import { COLLECTION_GLYPH } from '@/lib/inventory-meta'
import { Sheet } from '@/components/ds/sheet'
import { ItemArt } from '@/components/ds/item-art'
import { VoznyaCoin } from '@/components/ds/icon'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { Badge } from '@/components/ds/badge'

/**
 * ItemInspectSheet (Stage 2) — the premium "open an item" experience. Bottom
 * sheet (mobile-native) showing large artwork, rarity, collection, description,
 * acquisition source, ownership metadata, showcase controls, and — for pending
 * gifts — the full action set.
 *
 * IMPORTANT (frozen API contracts): the gift action logic (sell / withdraw /
 * gift / gift-link / transfer) is a faithful port of the original
 * components/v2/inventory-client.tsx. Endpoints, payloads, status handling and
 * notifyBalanceChanged() calls are UNCHANGED — backend/economy/ownership stay
 * exactly as Stage 1 left them.
 *
 * FUTURE ACTIONS (gift-to-profile / trade / marketplace) are present only as
 * disabled "coming soon" affordances — UX prepared, NOT implemented (Stage 2
 * brief: "Only prepare the UX").
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

type Panel = 'none' | 'send' | 'transfer'

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

/** Meta row in the ownership block. */
function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

// --- Gift actions (faithful port — DO NOT change endpoints/payloads) --------
function GiftActions({
  item,
  onConsumed,
}: {
  item: InventoryGiftItem
  onConsumed: (deliveryKey: string) => void
}) {
  const [state, setState] = useState<ActionState>('idle')
  const [msg, setMsg] = useState('')
  const [panel, setPanel] = useState<Panel>('none')
  const [recipient, setRecipient] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [confirmSell, setConfirmSell] = useState(false)

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

  function shareToTelegram() {
    const text = `🎁 Лови подарок: ${item.name}! Жми, чтобы забрать в Telegram.`
    const share = `https://t.me/share/url?url=${encodeURIComponent(linkUrl)}&text=${encodeURIComponent(text)}`
    window.open(share, '_blank', 'noopener,noreferrer')
  }

  async function sell() {
    if (busy) return
    if (!confirmSell) {
      setConfirmSell(true)
      return
    }
    setConfirmSell(false)
    setState('selling')
    setMsg('')
    const r = await sellGift(item.deliveryKey)
    if (r.ok) {
      setState('sold')
      setMsg(`+${fmt(r.amount ?? item.sellAmount)} ешек`)
      window.setTimeout(() => onConsumed(item.deliveryKey), 1200)
      return
    }
    setState('error')
    setMsg(r.message)
  }

  async function withdraw() {
    if (busy) return
    setState('withdrawing')
    setMsg('')
    const r = await withdrawGift(item.deliveryKey, item.isPremium)
    if (r.ok) {
      setState('withdrawn')
      setMsg(r.message)
      // Refunded cancellations linger a touch longer before clearing the card.
      window.setTimeout(() => onConsumed(item.deliveryKey), r.refunded ? 1500 : 1200)
      return
    }
    setState('error')
    setMsg(r.message)
  }

  const done =
    state === 'sold' || state === 'withdrawn' || state === 'gifted' || state === 'transferred'
  const withdrawLabel = item.isPremium ? '⭐ Активировать себе' : '📤 Вывести себе'

  if (done) {
    return (
      <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-3 text-center text-sm font-semibold text-emerald-300">
        {state === 'sold' ? `Продано ${msg}` : msg}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {panel === 'none' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={withdraw}
              disabled={busy}
              className="rounded-xl border border-primary/50 bg-primary/10 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20 active:scale-[0.98] disabled:opacity-50"
            >
              {state === 'withdrawing' ? '…' : withdrawLabel}
            </button>
            {!confirmSell ? (
              <button
                onClick={sell}
                disabled={busy}
                className="rounded-xl border border-amber-400/50 bg-amber-400/10 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 active:scale-[0.98] disabled:opacity-50"
              >
                {state === 'selling' ? '…' : `💰 Продать · ${fmt(item.sellAmount)}`}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={sell}
                  disabled={busy}
                  className="rounded-xl border border-amber-400/70 bg-amber-400/25 py-2.5 text-sm font-bold text-amber-100 transition hover:bg-amber-400/35 active:scale-[0.98] disabled:opacity-50"
                >
                  Продать ✓
                </button>
                <button
                  onClick={() => setConfirmSell(false)}
                  className="rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-white/10"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { resetPanels(); setPanel('send') }}
              disabled={busy}
              className="rounded-xl border border-sky-400/40 bg-sky-400/10 py-2.5 text-sm font-bold text-sky-300 transition hover:bg-sky-400/20 active:scale-[0.98] disabled:opacity-50"
            >
              🎁 Отправить другу
            </button>
            <button
              onClick={() => { resetPanels(); setPanel('transfer') }}
              disabled={busy}
              className="rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-foreground transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
            >
              🤝 Передать в Возне
            </button>
          </div>
          {confirmSell && (
            <p className="text-center text-[11px] text-amber-200/80">
              Продажа необратима — предмет исчезнет за ешки.
            </p>
          )}
          {state === 'error' && <p className="text-center text-[11px] text-red-300">{msg}</p>}
        </>
      ) : panel === 'send' ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">
            Настоящий подарок в Telegram другому человеку. Знаешь его @username —
            впиши; не запускал бота — отправь ссылку ниже.
          </p>
          <div className="flex gap-2">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && gift()}
              placeholder="@username или ID"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-sky-400/50"
            />
            <button
              onClick={gift}
              disabled={busy || !recipient.trim()}
              className="rounded-xl border border-sky-400/50 bg-sky-400/10 px-4 py-2.5 text-sm font-bold text-sky-300 transition hover:bg-sky-400/20 disabled:opacity-50"
            >
              {state === 'gifting' ? '…' : 'Отправить'}
            </button>
          </div>
          {!linkUrl ? (
            <button
              onClick={makeLink}
              disabled={busy}
              className="rounded-xl border border-sky-400/30 bg-sky-400/5 py-2.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/15 disabled:opacity-50"
            >
              {state === 'gifting' ? 'Создаю ссылку…' : '🔗 Получить ссылку (для любого)'}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={shareToTelegram}
                className="rounded-xl border border-sky-400/60 bg-sky-400/20 py-2.5 text-sm font-bold text-sky-200 transition hover:bg-sky-400/30"
              >
                ✈️ Отправить ссылку в Telegram
              </button>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={linkUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-xs text-foreground outline-none"
                />
                <button
                  onClick={copyLink}
                  className="rounded-xl border border-sky-400/50 bg-sky-400/10 px-4 py-2.5 text-sm font-bold text-sky-300 transition hover:bg-sky-400/20"
                >
                  Копировать
                </button>
              </div>
            </div>
          )}
          <button
            onClick={resetPanels}
            className="self-start rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/10"
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
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">
            Отдать предмет другому игроку ВНУТРИ Возни. Он окажется в его инвентаре —
            без отправки в Telegram.
          </p>
          <div className="flex gap-2">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && transfer()}
              placeholder="@username или ID игрока"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />
            <button
              onClick={transfer}
              disabled={busy || !recipient.trim()}
              className="rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-50"
            >
              {state === 'transferring' ? '…' : 'Передать'}
            </button>
          </div>
          <button
            onClick={resetPanels}
            className="self-start rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/10"
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
    </div>
  )
}

// --- Future actions block removed (disabled "Скоро" placeholders cheapened the
// transactional sheet). Re-add real actions here when they ship, not stubs. ---

export function ItemInspectSheet({
  item,
  open,
  onOpenChange,
  favorite,
  pinned,
  showcaseFull,
  showcaseSlots,
  showcaseCount,
  onToggleFavorite,
  onTogglePin,
  onConsumed,
}: {
  item: InvItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  favorite: boolean
  pinned: boolean
  showcaseFull: boolean
  showcaseSlots: number
  showcaseCount: number
  onToggleFavorite: (id: string) => void
  onTogglePin: (id: string) => void
  onConsumed: (deliveryKey: string) => void
}) {
  if (!item)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <Drawer.Title className="sr-only">Предмет</Drawer.Title>
        <span />
      </Sheet>
    )

  const t = rarityToken(item.rarity)
  const acquired = fmtDate(item.acquiredAt)
  const sourceLabel =
    item.source === 'case' ? 'Из кейса' : item.source === 'shop' ? 'Из магазина' : 'Каталог'
  const pinDisabled = !pinned && showcaseFull

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* A11y: provide an accessible name/description for the dialog without a
          visible title block (the hero <h2> below is the visual title). */}
      <Drawer.Title className="sr-only">{item.name}</Drawer.Title>
      <Drawer.Description className="sr-only">
        {item.collectionLabel} · {t.label}
      </Drawer.Description>

      {/* Hero artwork on a tier gradient */}
      <div
        className="relative -mx-4 -mt-4 mb-4 flex flex-col items-center overflow-hidden px-4 pb-5 pt-6 sm:-mx-6 sm:px-6"
        style={{ background: t.gradient }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(circle at 50% 20%, transparent, rgba(0,0,0,0.45))' }}
        />
        <div className="relative">
          <ItemArt code={item.code} itemClass={item.itemClass} glyph={item.glyph} rarity={item.rarity} size="xl" />
        </div>
        <h2 className="relative mt-3 text-center text-xl font-bold text-foreground">{item.name}</h2>
        <div className="relative mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          <RarityBadge rarity={item.rarity} />
          {item.isPremium && <Badge tone="warning">⭐ Premium</Badge>}
          {item.limited && <Badge tone="warning">🏆 Лимит</Badge>}
          {item.quantity > 1 && <Badge tone="neutral">×{item.quantity}</Badge>}
        </div>
      </div>

      {/* Collection */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
        <span aria-hidden="true" className="text-lg">{COLLECTION_GLYPH[item.collection]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Коллекция</p>
          <p className="truncate text-sm font-semibold text-foreground">{item.collectionLabel}</p>
        </div>
      </div>

      {/* Description */}
      {item.kind === 'stack' && item.raw.kind === 'stack' && item.raw.description && (
        <p className="mb-3 text-sm text-muted-foreground">{item.raw.description}</p>
      )}

      {/* Ownership metadata */}
      <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-1.5">
        <MetaRow label="Тип" value={item.typeLabel} />
        {item.value > 0 && (
          <MetaRow
            label="Ценность"
            value={<span className="inline-flex items-center gap-1"><span className="type-economy">{fmt(item.value)}</span> <VoznyaCoin tone="muted" /></span>}
          />
        )}
        {item.actionable && item.raw.kind === 'gift' && (
          <MetaRow
            label="Продажа"
            value={<span className="inline-flex items-center gap-1"><span className="type-economy">{fmt(item.raw.sellAmount)}</span> <VoznyaCoin tone="muted" /></span>}
          />
        )}
        <MetaRow label="Источник" value={sourceLabel} />
        {item.setName && <MetaRow label="Набор" value={`🧩 ${item.setName}`} />}
        {acquired && <MetaRow label="Получено" value={acquired} />}
        {item.equipped && <MetaRow label="Статус" value={<span className="text-emerald-300">надето</span>} />}
      </div>

      {/* Showcase controls */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
        >
          <span aria-hidden="true">{favorite ? '❤️' : '🤍'}</span>
          {favorite ? 'В избранном' : 'В избранное'}
        </button>
        <button
          type="button"
          onClick={() => !pinDisabled && onTogglePin(item.id)}
          disabled={pinDisabled}
          title={pinDisabled ? `Витрина заполнена (${showcaseCount}/${showcaseSlots})` : undefined}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: pinned ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
            background: pinned ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'rgba(255,255,255,0.03)',
            color: pinned ? 'var(--primary)' : 'var(--foreground)',
          }}
        >
          <span aria-hidden="true">📌</span>
          {pinned ? 'На витрине' : 'На витрину'}
        </button>
      </div>
      {pinDisabled && (
        <p className="-mt-2 mb-4 text-center text-[11px] text-muted-foreground">
          Витрина заполнена ({showcaseCount}/{showcaseSlots}). Открепи что-нибудь, чтобы добавить.
        </p>
      )}

      {/* Actions for pending gifts (frozen API) */}
      {item.actionable && item.raw.kind === 'gift' && (
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Действия
          </p>
          <GiftActions
            item={item.raw}
            onConsumed={(key) => {
              onConsumed(key)
              onOpenChange(false)
            }}
          />
        </div>
      )}
    </Sheet>
  )
}
