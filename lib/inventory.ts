// Client-safe inventory display helpers (no `pg`/`./db` import — safe to use in
// client components). Rarity/type visuals must stay in sync with the bot's
// app/settings/inventory.py and the catalog ITEM_RARITIES/ITEM_TYPES.

export type RarityStyle = {
  // Tailwind classes for border + subtle background tint of the item card.
  className: string
  // Human-readable rarity name (RU).
  label: string
  // Sort weight: rarer = higher.
  order: number
}

// Keys match the catalog ITEM_RARITIES (common..legendary).
export const RARITY_STYLES: Record<string, RarityStyle> = {
  common: {
    className: 'border-zinc-700 bg-zinc-800/40',
    label: 'Обычный',
    order: 1,
  },
  uncommon: {
    className: 'border-green-600/60 bg-green-900/15',
    label: 'Необычный',
    order: 2,
  },
  rare: {
    className: 'border-blue-500/60 bg-blue-900/15',
    label: 'Редкий',
    order: 3,
  },
  epic: {
    className: 'border-purple-500/60 bg-purple-900/15',
    label: 'Эпический',
    order: 4,
  },
  legendary: {
    className: 'border-amber-500/70 bg-amber-900/15',
    label: 'Легендарный',
    order: 5,
  },
}

const FALLBACK_RARITY: RarityStyle = {
  className: 'border-zinc-700 bg-zinc-800/40',
  label: 'Обычный',
  order: 0,
}

export function rarityStyle(rarity: string): RarityStyle {
  return RARITY_STYLES[rarity] ?? FALLBACK_RARITY
}

// Emoji per item type (matches the catalog ITEM_TYPES). 📦 fallback.
export const TYPE_EMOJI: Record<string, string> = {
  cosmetic: '✨',
  title: '🏷',
  badge: '🎖',
  frame: '🖼',
  avatar: '👤',
  collectible: '💎',
  event: '🎉',
}

export function typeEmoji(type: string): string {
  return TYPE_EMOJI[type] ?? '📦'
}
