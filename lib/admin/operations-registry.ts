// =============================================================================
// VOZNYA — OPERATIONS REGISTRY (Command Center → Operations Center)
// =============================================================================
//
// The single source of truth for "what can the owner control about VOZNYA as a
// system" — global service toggles and global modifiers. This is the operator's
// honest map of levers.
//
// HONESTY CONTRACT (the most important thing here):
// As of 2026-06-16 the bot DOES read these flags via app.settings.dynamic at
// each service entry point. Confirmed enforced today:
//   • Season on/off  → `seasons.is_active` row (start/finalize) — separate panel.
//   • casino/cases/shop/gifts/duel/farm `.enabled` → kill-switches read by the
//     bot before each action (casino/farm/duel handlers; cases.open_case &
//     gifts.buy_gift/deliver_gift atomic cores — so the site honors them too).
//   • modifier.eshki → economy core multiplies earned rewards (farm/treasure/
//     daily/mission/season/event/duel) by the factor.
//   • modifier.xp   → mmr.award_mmr scales positive MMR/XP awards.
//   • modifier.drop → cases reward picker boosts rare (jackpot/limited) weights.
// Still `armed` (stored, not yet read by the bot):
//   • modifier.reputation → reputation values are constrained to ±1 by a DB
//     check; scaling requires a schema change, so it waits.
//
// So each lever below carries an `enforcement`:
//   • 'enforced' — the bot honors this RIGHT NOW (flip it and it takes effect).
//   • 'armed'    — the admin can set the flag (it writes to app_settings and
//                  waits), but the bot does NOT read it yet. We show this state
//                  honestly instead of faking a working toggle.
//
// All toggle/modifier flags live in the SAME `app_settings` table the bot reads
// via app.settings.dynamic (≤60s cache). No new table, no migration.
// =============================================================================

export type Enforcement = 'enforced' | 'armed'

export type ServiceToggle = {
  id: string
  label: string
  emoji: string
  /** app_settings key that stores the on/off flag (boolean). */
  key: string
  /** Default when the flag is absent (systems are ON unless disabled). */
  default: boolean
  enforcement: Enforcement
  /** One-line operator note — what flipping this does / why it's armed. */
  note: string
}

export type GlobalModifier = {
  id: string
  label: string
  emoji: string
  /** app_settings key storing the multiplier (number, 1 = no effect). */
  key: string
  default: number
  /** Suggested quick values for the UI. */
  presets: number[]
  enforcement: Enforcement
  note: string
}

// --- Global service toggles -------------------------------------------------
// Season is intentionally NOT here: it has a dedicated, real control surface
// (start/finalize) rendered separately. These are the per-system on/off levers.
export const SERVICE_TOGGLES: ServiceToggle[] = [
  {
    id: 'casino',
    label: 'Казино',
    emoji: '🎰',
    key: 'casino.enabled',
    default: true,
    enforcement: 'enforced',
    note: 'Бот проверяет флаг перед каждой ставкой. Ставки (min/max) тоже живые.',
  },
  {
    id: 'cases',
    label: 'Кейсы',
    emoji: '🎁',
    key: 'cases.enabled',
    default: true,
    enforcement: 'enforced',
    note: 'Глобальный стоп открытия кейсов (бот и сайт) — поверх per-case is_active.',
  },
  {
    id: 'shop',
    label: 'Магазин',
    emoji: '🛒',
    key: 'shop.enabled',
    default: true,
    enforcement: 'enforced',
    note: 'Глобальный стоп покупок (бот и сайт) — единая точка buy_gift.',
  },
  {
    id: 'gifts',
    label: 'Подарки',
    emoji: '🎀',
    key: 'gifts.enabled',
    default: true,
    enforcement: 'enforced',
    note: 'Стоп выдачи подарков (поверх .env GIFTS_DELIVERY_ENABLED). Оплаченное ждёт в pending.',
  },
  {
    id: 'duels',
    label: 'Дуэли',
    emoji: '⚔️',
    key: 'duel.enabled',
    default: true,
    enforcement: 'enforced',
    note: 'Бот проверяет флаг перед началом дуэли.',
  },
  {
    id: 'farm',
    label: 'Ферма',
    emoji: '🌾',
    key: 'farm.enabled',
    default: true,
    enforcement: 'enforced',
    note: 'Бот проверяет флаг перед /ферма.',
  },
]

// --- Global modifiers -------------------------------------------------------
// eshki/xp/drop are enforced: the bot reads them dynamically (economy core,
// mmr.award_mmr, cases reward picker). reputation stays armed (DB constrains
// reputation to ±1, so a multiplier needs a schema change first).
export const GLOBAL_MODIFIERS: GlobalModifier[] = [
  {
    id: 'eshki',
    label: 'x Ешки',
    emoji: '💰',
    key: 'modifier.eshki',
    default: 1,
    presets: [1, 1.5, 2, 3],
    enforcement: 'enforced',
    note: 'Множитель к зарабатываемым ешкам (ферма, клад, дейлик, миссии, дуэли). Казино/покупки/переводы не трогает.',
  },
  {
    id: 'reputation',
    label: 'x Репутация',
    emoji: '❤️',
    key: 'modifier.reputation',
    default: 1,
    presets: [1, 2, 3],
    enforcement: 'armed',
    note: 'Репутация в БД ограничена ±1 — множитель требует правки схемы. Пока не применяется.',
  },
  {
    id: 'xp',
    label: 'x Опыт',
    emoji: '✨',
    key: 'modifier.xp',
    default: 1,
    presets: [1, 1.5, 2],
    enforcement: 'enforced',
    note: 'Множитель к начисляемому MMR/опыту (только начисления, не штрафы).',
  },
  {
    id: 'drop',
    label: 'x Шанс дропа',
    emoji: '🍀',
    key: 'modifier.drop',
    default: 1,
    presets: [1, 1.5, 2],
    enforcement: 'enforced',
    note: 'Поднимает эффективный вес редких наград кейса (джекпоты/лимитки).',
  },
]

export const TOGGLE_BY_KEY = new Map(SERVICE_TOGGLES.map((t) => [t.key, t] as const))
export const MODIFIER_BY_KEY = new Map(GLOBAL_MODIFIERS.map((m) => [m.key, m] as const))

/** All operations-owned app_settings keys (for bulk read). */
export const OPERATIONS_KEYS: string[] = [
  ...SERVICE_TOGGLES.map((t) => t.key),
  ...GLOBAL_MODIFIERS.map((m) => m.key),
]
