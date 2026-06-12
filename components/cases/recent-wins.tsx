'use client'

import { normalizeRarity, rarityToken } from '@/lib/rarity'
import { timeAgo } from '@/lib/events'
import { Glyph } from '@/components/ds/icon/glyph'
import { ItemArt } from '@/components/ds/item-art'
import { rewardKindClass } from '@/lib/case-open-ux'
import type { RecentCaseWin } from '@/lib/cases'

/**
 * RecentWins — social proof for the storefront ("недавно выиграли"). Real wins
 * from the case_openings ledger (read-only). Builds desire BEFORE the reel: you
 * see other players pulling the dream items, so the case feels alive and the
 * rare drops feel attainable. Presentation only — no data access here.
 *
 * Honest by construction: every row is a real recorded open (actor, item,
 * rarity, time). If the ledger is empty, the parent renders nothing.
 */
export function RecentWins({ wins }: { wins: RecentCaseWin[] }) {
  if (wins.length === 0) return null

  return (
    <section aria-label="Недавние выигрыши" className="space-y-2">
      <h2 className="flex items-center gap-1.5 px-0.5 text-sm font-bold text-foreground">
        <Glyph name="pulse" className="h-4 w-4 text-accent-indigo" />
        Недавно выиграли
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {wins.map((w) => {
          const rarity = normalizeRarity(w.rarity)
          const t = rarityToken(rarity)
          const accent = rarity !== 'common'
          return (
            <div
              key={w.id}
              className="flex shrink-0 items-center gap-2.5 rounded-xl border bg-white/[0.02] px-3 py-2"
              style={{
                borderColor: accent ? `${t.color}55` : 'rgba(255,255,255,0.08)',
              }}
            >
              <ItemArt
                code={w.rewardItemCode}
                itemClass={rewardKindClass(w.rewardKind, w.rewardItemCode)}
                glyph={<Glyph name={w.rewardKind === 'tg_gift' ? 'gift' : 'trophy'} className="h-4 w-4" />}
                rarity={rarity}
                size="sm"
                className="!h-8 !w-8 !rounded-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  <span className="text-muted-foreground">{w.actorName}</span>
                  {' · '}
                  <span style={{ color: accent ? t.color : undefined }}>{w.rewardName}</span>
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{timeAgo(w.createdAt)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
