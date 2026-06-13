// =============================================================================
// VOZNYA — OPERATIONS REGISTRY (Command Center → Operations Center)
// =============================================================================
//
// The single source of truth for "what can the owner control about VOZNYA as a
// system" — global service toggles and global modifiers. This is the operator's
// honest map of levers.
//
// HONESTY CONTRACT (the most important thing here):
// A read-only investigation of voznya-bot (2026-06-13) established that the bot
// has NO generic feature-flag mechanism. The only runtime levers that EXIST are:
//   • Season on/off  → `seasons.is_active` row (start/finalize) — REAL, today.
//   • Per-item flags  → case_definitions / gift_catalog / shop_offers.is_active.
//   • casino.min_bet / casino.max_bet → the ONLY app_settings keys the bot reads.
// Everything else (system on/off toggles, x2 multipliers, maintenance switch)
// does NOT exist in the bot yet and would require bot work.
//
// So each lever below carries an `enforcement`:
//   • 'enforced' — the bot honors this RIGHT NOW (flip it and it takes effect).
//   • 'armed'    — the admin can set the flag (it writes to app_settings and
//                  waits), but the bot does NOT read it yet. We show this state
//                  honestly instead of faking a working toggle. When the bot
//                  adds `dynamic.get_bool("<key>", True)` at the entry point,
//                  the same stored flag goes live with ZERO admin changes.
//
// All toggle/modifier flags live in the SAME `app_settings` table the bot reads
// via app.settings.dynamic (≤60s cache). No new table, no migration, no new
// architecture — exactly the constraint for this phase.
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
    enforcement: 'armed',
    note: 'Бот пока не проверяет флаг — нужна правка в casino/handlers. Ставки (min/max) уже живые.',
  },
  {
    id: 'cases',
    label: 'Кейсы',
    emoji: '🎁',
    key: 'cases.enabled',
    default: true,
    enforcement: 'armed',
    note: 'Глобального флага в боте нет (есть только per-case is_active). Готово к включению в боте.',
  },
  {
    id: 'shop',
    label: 'Магазин',
    emoji: '🛒',
    key: 'shop.enabled',
    default: true,
    enforcement: 'armed',
    note: 'Глобального флага нет (только per-item is_active). В боте магазин уже ведёт на сайт.',
  },
  {
    id: 'gifts',
    label: 'Подарки',
    emoji: '🎀',
    key: 'gifts.enabled',
    default: true,
    enforcement: 'armed',
    note: 'Реальная доставка управляется через .env GIFTS_DELIVERY_ENABLED (нужен рестарт).',
  },
  {
    id: 'duels',
    label: 'Дуэли',
    emoji: '⚔️',
    key: 'duel.enabled',
    default: true,
    enforcement: 'armed',
    note: 'Бот пока не проверяет флаг — нужна правка в duel/handlers.',
  },
  {
    id: 'farm',
    label: 'Ферма',
    emoji: '🌾',
    key: 'farm.enabled',
    default: true,
    enforcement: 'armed',
    note: 'Бот пока не проверяет флаг — нужна правка в farm/handlers.',
  },
]

// --- Global modifiers -------------------------------------------------------
// None are enforced yet: the economy core (services/economy.py) applies amounts
// verbatim with no multiplier hook. These are the foundation/contract so that
// when the bot adds a multiplier read, the operator surface already exists.
export const GLOBAL_MODIFIERS: GlobalModifier[] = [
  {
    id: 'eshki',
    label: 'x Ешки',
    emoji: '💰',
    key: 'modifier.eshki',
    default: 1,
    presets: [1, 1.5, 2, 3],
    enforcement: 'armed',
    note: 'Множитель к награждаемым ешкам. Бот пока умножение не применяет.',
  },
  {
    id: 'reputation',
    label: 'x Репутация',
    emoji: '❤️',
    key: 'modifier.reputation',
    default: 1,
    presets: [1, 2, 3],
    enforcement: 'armed',
    note: 'Множитель к репутации. Бот пока не применяет.',
  },
  {
    id: 'xp',
    label: 'x Опыт',
    emoji: '✨',
    key: 'modifier.xp',
    default: 1,
    presets: [1, 1.5, 2],
    enforcement: 'armed',
    note: 'Множитель к опыту/MMR. Бот пока не применяет.',
  },
  {
    id: 'drop',
    label: 'x Шанс дропа',
    emoji: '🍀',
    key: 'modifier.drop',
    default: 1,
    presets: [1, 1.5, 2],
    enforcement: 'armed',
    note: 'Множитель шанса редкого дропа. Бот пока не применяет.',
  },
]

export const TOGGLE_BY_KEY = new Map(SERVICE_TOGGLES.map((t) => [t.key, t] as const))
export const MODIFIER_BY_KEY = new Map(GLOBAL_MODIFIERS.map((m) => [m.key, m] as const))

/** All operations-owned app_settings keys (for bulk read). */
export const OPERATIONS_KEYS: string[] = [
  ...SERVICE_TOGGLES.map((t) => t.key),
  ...GLOBAL_MODIFIERS.map((m) => m.key),
]
