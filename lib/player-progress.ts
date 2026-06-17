// Player progress — a focused, server-only read for the Guide's PERSONAL layer.
//
// The Guide is a static catalog (every achievement / every title). To make it
// personal ("which have I unlocked? what's my title?") we need just two cheap
// facts about the signed-in player, NOT the whole heavy getPlayerProfile
// aggregate. This loader returns exactly that and nothing more.
//
// Read-only: the bot owns users / user_achievements. We never write here.
import 'server-only'

import { query } from './db'
import { TITLES, titleForEarned, type Title } from './voznya-bot'

export interface PlayerProgress {
  /** Lifetime earned (drives the title ladder). */
  totalEarned: number
  /** The player's current title (from totalEarned). */
  currentTitle: Title
  /** Index of the current title in the ascending TITLES ladder. */
  currentTitleIndex: number
  /** Codes of achievements the player has unlocked. */
  unlockedCodes: string[]
}

/**
 * Loads the signed-in player's progress facts. Throws on DB error so the API
 * route can decide how to degrade (the Guide stays fully usable without it).
 */
export async function getPlayerProgress(userId: number): Promise<PlayerProgress> {
  const [earnedRows, achRows] = await Promise.all([
    query<{ total_earned: string | null }>(
      `SELECT total_earned FROM users WHERE user_id = $1`,
      [userId],
    ),
    query<{ code: string }>(
      `SELECT code FROM user_achievements WHERE user_id = $1`,
      [userId],
    ),
  ])

  const totalEarned = Number(earnedRows[0]?.total_earned ?? 0)
  const currentTitle = titleForEarned(totalEarned)
  const currentTitleIndex = TITLES.findIndex((t) => t.name === currentTitle.name)

  return {
    totalEarned,
    currentTitle,
    currentTitleIndex,
    unlockedCodes: achRows.map((r) => r.code),
  }
}
