// =============================================================================
// VOZNYA — SETTINGS REGISTRY (Command Center, Settings Humanization)
// =============================================================================
//
// Turns the raw `app_settings` key/JSON store into HUMAN operator controls. The
// operator sees "Максимальная ставка" with a number field + unit + bounds, not
// `casino.max_bet` and a JSON box. Each entry maps ONE app_settings key to its
// control metadata (label, help, control type, unit, min/max/step, default).
//
// CONTRACT: this is purely a presentation/validation layer. Values still write
// to the SAME `app_settings` table the bot reads via `app.settings.dynamic`
// (cache TTL ~60s) — no bot change, no migration. A key only takes EFFECT when
// the bot actually reads it dynamically. As of 2026-06-16 the bot reads EVERY
// key in this registry via `dynamic.get_*` (casino/farm/duel/daily/season/
// economy), so all are marked `liveNow`. Durations are stored in SECONDS.
//
// Unknown keys (anything not in the registry) fall back to the raw editor, so
// nothing is hidden or lost.
// =============================================================================

export type SettingControl = 'number' | 'toggle' | 'duration' | 'percent' | 'text'

export type SettingDef = {
  /** The exact app_settings key the bot reads. Never shown as the primary UI. */
  key: string
  /** Human label, e.g. "Максимальная ставка". */
  label: string
  /** One-line help / what it does. */
  help?: string
  control: SettingControl
  /** Unit suffix for display (number/duration), e.g. "ешек", "сек". */
  unit?: string
  min?: number
  max?: number
  step?: number
  /** Code default (mirrors the bot's balance.py) shown as the baseline. */
  default: number | boolean | string
  /** True when the bot is confirmed to read this key dynamically today. */
  liveNow?: boolean
}

export type SettingGroup = {
  id: string
  label: string
  /** Short operator-facing description of the domain. */
  blurb?: string
  settings: SettingDef[]
}

/**
 * The registry. Defaults mirror voznya-bot/app/settings/balance.py. `liveNow`
 * marks keys the bot already reads via dynamic.get_* (verified in
 * app/features/casino). Durations are stored in SECONDS (the bot's unit) but
 * edited in human units by the control.
 */
export const SETTINGS_REGISTRY: SettingGroup[] = [
  {
    id: 'casino',
    label: 'Казино',
    blurb: 'Ставки и доступность игры.',
    settings: [
      { key: 'casino.min_bet', label: 'Минимальная ставка', control: 'number', unit: 'ешек', min: 1, max: 1_000_000, step: 1, default: 1, liveNow: true },
      { key: 'casino.max_bet', label: 'Максимальная ставка', control: 'number', unit: 'ешек', min: 1, max: 100_000_000, step: 10, default: 1000, liveNow: true },
      { key: 'casino.enabled', label: 'Казино включено', help: 'Глобальный переключатель игры. Бот проверяет перед каждой ставкой.', control: 'toggle', default: true, liveNow: true },
      { key: 'casino.cooldown', label: 'Кулдаун казино', control: 'duration', unit: 'сек', min: 0, max: 86_400, step: 60, default: 3600, liveNow: true },
    ],
  },
  {
    id: 'farm',
    label: 'Ферма',
    blurb: 'Доходность и кулдаун /ферма.',
    settings: [
      { key: 'farm.cooldown', label: 'Кулдаун фермы', control: 'duration', unit: 'сек', min: 0, max: 86_400, step: 60, default: 14400, liveNow: true },
      { key: 'farm.bonus', label: 'Бонус к доходу', help: 'Прибавка сверх базы (0.25 = +25%). Суммируется со стрик-бонусом.', control: 'percent', min: 0, max: 5, step: 0.05, default: 0, liveNow: true },
      { key: 'farm.enabled', label: 'Ферма включена', control: 'toggle', default: true, liveNow: true },
    ],
  },
  {
    id: 'daily',
    label: 'Дейлики',
    blurb: 'Ежедневная награда.',
    settings: [
      { key: 'daily.reward', label: 'Награда за дейлик', help: 'Плоский размер награды. Переопределяет таблицу стрик-наград бота.', control: 'number', unit: 'ешек', min: 0, max: 1_000_000, step: 1, default: 50, liveNow: true },
      { key: 'daily.cooldown', label: 'Кулдаун дейлика', help: 'Дейлик привязан к календарному дню (UTC); бот этот ключ пока не читает.', control: 'duration', unit: 'сек', min: 0, max: 604_800, step: 3600, default: 86400 },
    ],
  },
  {
    id: 'duels',
    label: 'Дуэли',
    blurb: 'Ставки и доступность /дуэль.',
    settings: [
      { key: 'duel.min_bet', label: 'Минимальная ставка', control: 'number', unit: 'ешек', min: 1, max: 1_000_000, step: 1, default: 1, liveNow: true },
      { key: 'duel.max_bet', label: 'Максимальная ставка', control: 'number', unit: 'ешек', min: 1, max: 100_000_000, step: 10, default: 100000, liveNow: true },
      { key: 'duel.cooldown', label: 'Кулдаун дуэли', control: 'duration', unit: 'сек', min: 0, max: 86_400, step: 30, default: 1800, liveNow: true },
      { key: 'duel.enabled', label: 'Дуэли включены', control: 'toggle', default: true, liveNow: true },
    ],
  },
  {
    id: 'season',
    label: 'Сезон',
    blurb: 'Параметры текущего сезона.',
    settings: [
      { key: 'season.xp_bonus', label: 'Бонус опыта сезона', help: 'Прибавка к начисляемому MMR/опыту (0.5 = +50%).', control: 'percent', min: 0, max: 5, step: 0.05, default: 0, liveNow: true },
    ],
  },
  {
    id: 'economy',
    label: 'Экономика',
    blurb: 'Базовые курсы. Менять осторожно.',
    settings: [
      { key: 'economy.eshki_per_star', label: 'Ешек за 1 звезду', help: 'Курс оценки призов кейсов по star_cost (фолбэк продажи/возврата).', control: 'number', unit: 'ешек', min: 1, max: 100_000, step: 1, default: 10, liveNow: true },
      { key: 'economy.item_sell_rate', label: 'Возврат при продаже', help: 'Доля стоимости при продаже предмета из инвентаря.', control: 'percent', min: 0, max: 1, step: 0.05, default: 0.7, liveNow: true },
    ],
  },
]

/** Flattened key → def lookup for fast classification of stored rows. */
export const SETTINGS_BY_KEY: Map<string, SettingDef> = new Map(
  SETTINGS_REGISTRY.flatMap((g) => g.settings.map((s) => [s.key, s] as const)),
)

/** All keys the registry knows about (used to separate "raw/unknown" rows). */
export const KNOWN_SETTING_KEYS: Set<string> = new Set(SETTINGS_BY_KEY.keys())

/**
 * Validate a value against a setting def. Returns a normalized value (the JSON
 * we store) or an error string. Keeps the operator from saving nonsense
 * (negative bet, bet above cap, non-boolean toggle).
 */
export function validateSetting(def: SettingDef, raw: unknown): { value: number | boolean | string } | { error: string } {
  switch (def.control) {
    case 'toggle': {
      if (typeof raw !== 'boolean') return { error: `${def.label}: ожидается вкл/выкл` }
      return { value: raw }
    }
    case 'text': {
      const s = String(raw ?? '').trim()
      if (!s) return { error: `${def.label}: пусто` }
      return { value: s }
    }
    case 'number':
    case 'duration':
    case 'percent': {
      const n = Number(raw)
      if (!Number.isFinite(n)) return { error: `${def.label}: ожидается число` }
      if (def.min != null && n < def.min) return { error: `${def.label}: минимум ${def.min}` }
      if (def.max != null && n > def.max) return { error: `${def.label}: максимум ${def.max}` }
      return { value: n }
    }
    default:
      return { error: 'неизвестный тип контрола' }
  }
}
