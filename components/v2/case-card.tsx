import { rarityToken } from '@/lib/rarity'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { chanceLabel, qtyLabel, type CaseView, type RewardView } from '@/lib/cases-ux'

/**
 * CaseCard (V3, поверхность №5) — витрина кейса с акцентом на ЦЕННОСТИ наград,
 * не на открытии. Дорогой, но не «казино-баннер»: тёмная капсула с подсветкой
 * высшего тира, превью лучших наград, шанс редкого выпадения, стоимость.
 * Server component. Разметка готова под будущую анимацию открытия (контейнер
 * `data-case-stage` зарезервирован, сейчас статичен).
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

function costLabel(c: CaseView): string {
  if (c.openCostKind === 'currency' && c.openCostAmount > 0) return `${fmt(c.openCostAmount)} ешек`
  if (c.consumesKey) return 'нужен ключ'
  return 'бесплатно'
}

function RewardRow({ r }: { r: RewardView }) {
  const t = rarityToken(r.rarity)
  const qty = qtyLabel(r)
  return (
    <li
      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
      style={{
        borderColor: r.rarity === 'common' ? 'rgba(255,255,255,0.08)' : `${t.color}66`,
      }}
    >
      <span aria-hidden="true">{r.isJackpot ? '💎' : r.rewardKind === 'currency' ? '💰' : '🎖️'}</span>
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
  const preview = c.best.slice(0, 4)

  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-3xl border bg-white/[0.02] p-5"
      style={{
        borderColor: c.topRarity === 'common' ? 'rgba(255,255,255,0.1)' : `${top.color}80`,
        boxShadow: c.topRarity === 'common' ? undefined : top.glow || undefined,
      }}
    >
      {/* Капсула кейса (под будущую анимацию открытия) */}
      <div
        data-case-stage={c.itemCode}
        className="relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: `radial-gradient(circle at 50% 120%, ${top.color}33, transparent 60%)`,
        }}
      >
        <span className="text-6xl drop-shadow-lg" aria-hidden="true">📦</span>
        {c.hasJackpot && (
          <span className="absolute right-2 top-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            💎 джекпот
          </span>
        )}
      </div>

      {/* Заголовок + стоимость */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="truncate text-lg font-bold text-foreground">{c.name}</h3>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={{ borderColor: `${top.color}66`, color: top.color }}
        >
          {costLabel(c)}
        </span>
      </div>
      {c.description && <p className="mb-3 text-sm text-muted-foreground">{c.description}</p>}

      {/* Шанс редкого выпадения — мера ценности */}
      {c.rareChance > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Шанс редкой награды</span>
          <span className="font-semibold" style={{ color: top.color }}>
            {chanceLabel(c.rareChance)}
          </span>
        </div>
      )}

      {/* Превью лучших наград (ценность вперёд) */}
      {preview.length === 0 ? (
        <p className="text-xs text-muted-foreground">Содержимое скоро появится.</p>
      ) : (
        <>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Лучшие награды
          </h4>
          <ul className="space-y-1.5">
            {preview.map((r, idx) => (
              <RewardRow key={`${r.rewardItemCode ?? r.rewardKind}-${idx}`} r={r} />
            ))}
          </ul>
          {c.rewardsView.length > preview.length && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              и ещё {c.rewardsView.length - preview.length} наград внутри
            </p>
          )}
        </>
      )}
    </article>
  )
}
