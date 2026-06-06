/**
 * MMR ranks — display-only data, safe to import from both server and client.
 *
 * This module has NO server-only dependencies (no `pg`, no `./db`). It exists
 * so client components can read rank thresholds/labels without dragging the
 * database layer into the browser bundle. The server-side `lib/queries.ts`
 * re-exports these symbols, so existing server imports keep working.
 *
 * TypeScript mirror of `app/settings/mmr.py` (RANKS) in the bot repo. Keep the
 * two in sync. Thresholds are display-only (no migration needed to change them).
 * The rank is NEVER hardcoded in components — they read it from the profile,
 * which derives it via `mmrRank()`.
 */
export type MmrRank = { minMmr: number; emoji: string; name: string }

export const MMR_RANKS: readonly MmrRank[] = [
  { minMmr: 0, emoji: '🥉', name: 'Залётный' },
  { minMmr: 1000, emoji: '🥈', name: 'Бродяга Утрехта' },
  { minMmr: 2500, emoji: '🥇', name: 'Свой в Зволле' },
  { minMmr: 5000, emoji: '💎', name: 'Котейший' },
  { minMmr: 10000, emoji: '👑', name: 'Архидрун' },
  { minMmr: 25000, emoji: '🔥', name: 'Боженька Возни' },
]

export function mmrRank(mmr: number): MmrRank {
  let current = MMR_RANKS[0]
  for (const rank of MMR_RANKS) {
    if (mmr >= rank.minMmr) current = rank
    else break
  }
  return current
}
