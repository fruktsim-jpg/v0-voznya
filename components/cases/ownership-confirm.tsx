'use client'

/**
 * OwnershipConfirm (Cases Tier 1 — Ownership Confirmation).
 *
 * The beat the loop was missing: after the reveal, the player must FEEL the win
 * became theirs — "это моё" — without being pushed away to Inventory first. This
 * card states ownership in-place using the SAME authored art the reveal showed.
 *
 * Honest to Model 2: the grant already happened server-side (open_case is the
 * single writer — the item is in `inventory`, or the gift is a pending
 * `gift_transactions` row). This is pure CONFIRMATION of a real write, never a
 * second write.
 *
 * Two ownership shapes:
 *   - item      → already in the vault. Confirmed outright ("в твоём хранилище").
 *   - tg_gift   → owned but pending a decision; this frames it ("подарок твой"),
 *                 the GiftChoice below resolves the fate. We say it's yours, then
 *                 let them keep/sell/withdraw.
 */

import { rarityToken } from '@/lib/rarity'
import type { WonReward } from '@/lib/case-open-ux'
import { Glyph } from '@/components/ds/icon'
import { CoinAmount } from '@/components/ds/coin'

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function OwnershipConfirm({ won }: { won: WonReward }) {
  const t = rarityToken(won.rarity)
  const isGift = won.kind === 'tg_gift'
  const isCurrency = won.kind === 'currency'

  // Currency has no "ownership" to confirm — it merges into the balance. The
  // reveal already shows the amount + new balance; no confirmation card needed.
  if (isCurrency) return null

  const ownedQty = won.qty > 1 ? won.qty : 1

  return (
    <div
      className="relative overflow-hidden rounded-2xl border px-3.5 py-3"
      style={{
        borderColor: `${t.color}55`,
        background: `linear-gradient(180deg, ${t.color}14, transparent 90%)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${t.color}26`, color: t.color }}
        >
          <Glyph name={isGift ? 'gift' : 'check'} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {isGift ? 'Подарок теперь твой' : 'Теперь это твоё'}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {isGift ? (
              <>В инвентаре, ждёт решения ниже</>
            ) : (
              <>
                Добавлено в хранилище
                {ownedQty > 1 ? ` · ${fmt(ownedQty)} шт.` : ''}
              </>
            )}
          </p>
        </div>
        {/* Value, when known — reinforces "it matters", in minted currency. */}
        {won.value != null && won.value > 0 && (
          <span className="shrink-0 text-right">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Ценность
            </span>
            <CoinAmount value={won.value} size="sm" className="font-bold" />
          </span>
        )}
      </div>
    </div>
  )
}
