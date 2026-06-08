'use client'

import { Drawer } from 'vaul'
import { rarityToken } from '@/lib/rarity'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { chanceLabel, qtyLabel, type CaseView, type RewardView } from '@/lib/cases-ux'
import { CaseOpener } from '@/components/v2/case-opener'

/**
 * CaseCard (App Redesign V1) — ПЛОТНАЯ карточка-витрина решения. На экране
 * телефона помещается 3+ кейса. Карточка показывает только то, что нужно для
 * решения «крутить или нет»: название, цена, главный джекпот, шанс Gift, шанс
 * Premium, кнопка открытия. Всё остальное (полный дроп-лист, описание, редкости)
 * живёт в bottom-sheet, который открывается по тапу. Открытие (рулетка) тоже
 * происходит в шите — спокойная сетка карточек не прыгает. Экономика/RNG —
 * по-прежнему в боте через open_case.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

function costLabel(c: CaseView): string {
  if (c.openCostKind === 'currency' && c.openCostAmount > 0) return `${fmt(c.openCostAmount)} ешек`
  if (c.consumesKey) return 'нужен ключ'
  return 'бесплатно'
}

/** Строка награды в полном дроп-листе (внутри шита). */
function RewardRow({ r }: { r: RewardView }) {
  const t = rarityToken(r.rarity)
  const qty = qtyLabel(r)
  return (
    <li
      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
      style={{ borderColor: r.rarity === 'common' ? 'rgba(255,255,255,0.08)' : `${t.color}66` }}
    >
      <span aria-hidden="true">
        {r.isJackpot ? '💎' : r.rewardKind === 'currency' ? '💰' : r.rewardKind === 'tg_gift' ? '🎁' : '🎖️'}
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">
        {r.label}
        {qty && <span className="ml-1 text-muted-foreground">{qty}</span>}
        {r.limited && <span className="ml-2 text-[11px] text-amber-300">лимит</span>}
      </span>
      <RarityBadge rarity={r.rarity} />
      <span className="shrink-0 font-mono text-xs" style={{ color: t.color }}>
        {chanceLabel(r.chance)}
      </span>
    </li>
  )
}

export function CaseCard({ caseView }: { caseView: CaseView }) {
  const c = caseView
  const top = rarityToken(c.topRarity)
  const accent = c.topRarity !== 'common'

  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <article
          className="glass group relative flex w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl border border-border p-3 text-left transition active:scale-[0.99]"
          style={{
            borderColor: accent ? `${top.color}99` : undefined,
          }}
        >
          {/* Строка 1: иконка + название + цена */}
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl"
              style={{ background: `radial-gradient(circle at 50% 35%, ${top.color}33, transparent 70%)` }}
              aria-hidden="true"
            >
              📦
            </span>
            <h3 className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{c.name}</h3>
            <span
              className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{ borderColor: `${top.color}66`, color: top.color }}
            >
              {costLabel(c)}
            </span>
          </div>

          {/* Строка 2: главный джекпот */}
          {c.hasJackpot && c.topReward && (
            <div className="flex items-center gap-1.5 text-xs text-amber-200">
              <span aria-hidden="true">💎</span>
              <span className="min-w-0 flex-1 truncate">{c.topReward.label}</span>
              {c.jackpotChance > 0 && (
                <span className="shrink-0 font-mono font-semibold text-amber-300">
                  {chanceLabel(c.jackpotChance)}
                </span>
              )}
            </div>
          )}

          {/* Строка 3: шансы Gift / Premium */}
          {(c.giftChance > 0 || c.premiumChance > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {c.giftChance > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/[0.08] px-2 py-0.5 text-[11px] font-semibold text-fuchsia-200">
                  🎁 Gift {chanceLabel(c.giftChance)}
                </span>
              )}
              {c.premiumChance > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                  ⭐ Premium {chanceLabel(c.premiumChance)}
                </span>
              )}
            </div>
          )}

          {/* Кнопка открытия (тап открывает шит, где идёт рулетка) */}
          <span className="mt-0.5 block w-full rounded-xl border border-primary/50 bg-primary/10 py-2 text-center text-sm font-bold text-primary">
            Открыть · {costLabel(c)}
          </span>
        </article>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] mt-24 flex max-h-[90vh] flex-col rounded-t-3xl border-t border-border bg-background outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20" />
          <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3">
            {/* Шапка деталей */}
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-3xl"
                style={{ background: `radial-gradient(circle at 50% 35%, ${top.color}33, transparent 70%)` }}
                aria-hidden="true"
              >
                📦
              </span>
              <div className="min-w-0 flex-1">
                <Drawer.Title className="truncate text-lg font-bold text-foreground">{c.name}</Drawer.Title>
                <div className="text-xs text-muted-foreground">{costLabel(c)}</div>
              </div>
            </div>

            {c.description && (
              <p className="mb-3 text-sm text-muted-foreground">{c.description}</p>
            )}

            {/* Открытие прямо в шите */}
            <CaseOpener caseItemCode={c.itemCode} costLabel={costLabel(c)} rewards={c.rewardsView} />

            {/* Полный дроп-лист */}
            {c.rewardsView.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Содержимое · {c.rewardsView.length} наград
                </h4>
                <ul className="space-y-1.5">
                  {c.best.map((r, idx) => (
                    <RewardRow key={`${r.rewardItemCode ?? r.rewardKind}-${idx}`} r={r} />
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Шансы — из весов дроп-листа, каждое открытие в проверяемом логе.
              Лимитированные награды ограничены по количеству.
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
