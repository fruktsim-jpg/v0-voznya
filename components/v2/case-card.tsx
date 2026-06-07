import { rarityToken, type Rarity } from '@/lib/rarity'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { chanceLabel, qtyLabel, type CaseView, type RewardView } from '@/lib/cases-ux'

/**
 * CaseCard (V3, поверхность №5) — витрина кейса с акцентом на ЦЕННОСТИ наград,
 * не на открытии. Визуальный язык выровнен под `CollectibleTile` (единый мир
 * коллекционных объектов Возни): `glass`-поверхность, лёгкий hover-подъём,
 * капсула с радиальным свечением цвета редкости, бейдж редкости тира. Кейс
 * сохраняет уникальный контент — список лучших наград. Server component.
 * Контейнер `data-case-stage` зарезервирован под будущую анимацию открытия.
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

/**
 * Кейс-стейдж: горизонтальная полоса плашек редкостей содержимого с маской по
 * краям и центральной риской-указателем. Чистая декорация (никакого RNG/исхода)
 * и одновременно визуальный каркас будущей рулетки — она ляжет в этот же блок.
 */
function RarityStrip({ strip }: { strip: Rarity[] }) {
  // Дублируем полосу, чтобы она выглядела «длинной лентой лута» даже на 3–4
  // наградах. Порядок (от редкого к частому) повторяется — это превью, не RNG.
  const cells = strip.length > 0 ? [...strip, ...strip, ...strip] : []
  if (cells.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 overflow-hidden">
      <div
        className="flex h-full items-stretch gap-1 px-1"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
        }}
      >
        {cells.map((r, i) => {
          const t = rarityToken(r)
          return (
            <span
              key={i}
              className="h-full flex-1 rounded-sm"
              style={{
                minWidth: 14,
                backgroundColor: `${t.color}26`,
                borderTop: `2px solid ${t.color}`,
              }}
            />
          )
        })}
      </div>
      {/* Центральная риска-указатель — куда «остановится» будущая рулетка. */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/70"
      />
    </div>
  )
}

export function CaseCard({ caseView }: { caseView: CaseView }) {
  const c = caseView
  const top = rarityToken(c.topRarity)
  const preview = c.best.slice(0, 4)

  const accent = c.topRarity !== 'common'

  return (
    <article
      className="glass group relative flex flex-col overflow-hidden rounded-3xl border border-border p-5 transition hover:-translate-y-0.5"
      style={{
        borderColor: accent ? top.color : undefined,
        boxShadow: accent ? top.glow || undefined : undefined,
      }}
    >
      {/* Свечение-фон цвета редкости (как в CollectibleTile) */}
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full opacity-40 blur-3xl transition group-hover:opacity-60"
          style={{ backgroundColor: top.color }}
        />
      )}

      {/* Капсула кейса (под будущую анимацию открытия) */}
      <div
        data-case-stage={c.itemCode}
        className="relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${top.color}33, transparent 70%)`,
        }}
      >
        <span className="text-6xl drop-shadow-lg transition group-hover:scale-110" aria-hidden="true">
          📦
        </span>

        {c.hasJackpot && (
          <span className="absolute right-2 top-2 z-10 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            💎 джекпот
          </span>
        )}

        {/* Лента редкостей содержимого — каркас будущей рулетки. */}
        <RarityStrip strip={c.rarityStrip} />
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
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Шанс редкой награды</span>
          <span className="font-semibold" style={{ color: top.color }}>
            {chanceLabel(c.rareChance)}
          </span>
        </div>
      )}

      {/* Шанс джекпота / топ-дропа — «ради чего крутить» */}
      {c.hasJackpot && c.topReward && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-2.5 py-1.5 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 text-amber-200">
            <span aria-hidden="true">💎</span>
            <span className="truncate">{c.topReward.label}</span>
          </span>
          {c.jackpotChance > 0 && (
            <span className="shrink-0 font-mono font-semibold text-amber-300">
              {chanceLabel(c.jackpotChance)}
            </span>
          )}
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
