import type { PlayerProfile } from '@/lib/queries'

/**
 * Profile narrative layer — turns a player's raw stats into a CHARACTER, not a
 * dashboard. Pure, presentational, read-only: every output is derived from
 * fields ALREADY present on PlayerProfile (no new queries). Two devices:
 *
 *   1. Archetype — a PRIMARY + SECONDARY label ("Магнат · Голос чата") that
 *      answers "what makes this player different" before any number is read.
 *   2. Play-style read — a one-line INTERPRETATION ("рисковый, но не сдаётся")
 *      so the viewer gets a verdict, not a table to analyse himself.
 *
 * Honest by construction: a trait only fires when its backing stat is real and
 * meaningful (thresholds below), so we never label an empty profile.
 */

export type ArchetypeKey =
  | 'magnate' // богатство / заработок
  | 'duelist' // дуэли
  | 'gambler' // казино
  | 'voice' // сообщения
  | 'collector' // редкие предметы
  | 'farmer' // фарм-серия
  | 'family' // брак
  | 'respected' // репутация
  | 'newcomer' // нечем выделиться пока

type ArchetypeDef = { key: ArchetypeKey; label: string; sub: string }

const LABELS: Record<ArchetypeKey, string> = {
  magnate: 'Магнат',
  duelist: 'Дуэлянт',
  gambler: 'Игрок казино',
  voice: 'Голос чата',
  collector: 'Коллекционер',
  farmer: 'Фермер',
  family: 'Семьянин',
  respected: 'Уважаемый',
  newcomer: 'Новичок',
}

/**
 * Score each possible trait from real fields. Higher score = stronger claim.
 * Scores are deliberately on different scales but only compared by RANK within
 * one player, so relative dominance is what selects primary/secondary.
 */
function traitScores(p: PlayerProfile): { key: ArchetypeKey; score: number }[] {
  const duelsTotal = p.duelsWon + p.duelsLost
  const winRate = duelsTotal > 0 ? p.duelsWon / duelsTotal : 0
  const rareItems = (p.inventory?.list ?? []).filter(
    (i) => i.rarity !== 'common' && i.rarity !== 'uncommon',
  ).length

  const out: { key: ArchetypeKey; score: number }[] = []

  // Богатство: место в топе + абсолютный заработок.
  if (p.rankInTop != null && p.rankInTop <= 10) out.push({ key: 'magnate', score: 100 - p.rankInTop * 5 })
  else if (p.totalEarned >= 50_000) out.push({ key: 'magnate', score: 40 })

  // Дуэли: объём + винрейт.
  if (duelsTotal >= 10) out.push({ key: 'duelist', score: 30 + duelsTotal * 0.5 + winRate * 40 })

  // Казино: объём игр.
  if (p.casinoGamesCount >= 20) out.push({ key: 'gambler', score: 25 + Math.min(50, p.casinoGamesCount * 0.3) })

  // Голос: место по сообщениям / объём.
  if (p.ranks.byMessages != null && p.ranks.byMessages <= 10) out.push({ key: 'voice', score: 90 - p.ranks.byMessages * 4 })
  else if (p.messages >= 3_000) out.push({ key: 'voice', score: 35 })

  // Коллекционер: редкие+ предметы.
  if (rareItems >= 3) out.push({ key: 'collector', score: 30 + rareItems * 6 })

  // Фермер: длинная серия активности.
  if (p.maxFarmStreak >= 14) out.push({ key: 'farmer', score: 20 + Math.min(50, p.maxFarmStreak) })

  // Семья: в браке.
  if (p.marriage) out.push({ key: 'family', score: 28 + Math.min(40, p.marriage.days * 0.2) })

  // Уважение: место по репутации.
  if (p.ranks.byReputation != null && p.ranks.byReputation <= 10) out.push({ key: 'respected', score: 85 - p.ranks.byReputation * 4 })
  else if ((p.reputation ?? 0) >= 20) out.push({ key: 'respected', score: 30 })

  return out.sort((a, b) => b.score - a.score)
}

/**
 * Primary + secondary archetype. Falls back to "Новичок" when the player has no
 * meaningful trait yet (honest: a fresh account is a newcomer, not a "Магнат").
 */
export function archetype(p: PlayerProfile): ArchetypeDef {
  const scores = traitScores(p)
  if (scores.length === 0) {
    return { key: 'newcomer', label: LABELS.newcomer, sub: 'Только начинает путь в Возне' }
  }
  const primary = scores[0].key
  const secondary = scores[1]?.key
  const label = secondary ? `${LABELS[primary]} · ${LABELS[secondary]}` : LABELS[primary]
  return { key: primary, label, sub: archetypeSub(primary, p) }
}

/** Short proof-line under the archetype, using the strongest real number. */
function archetypeSub(key: ArchetypeKey, p: PlayerProfile): string {
  switch (key) {
    case 'magnate':
      return p.rankInTop != null ? `#${p.rankInTop} по богатству в Возне` : 'Один из самых богатых'
    case 'duelist': {
      const t = p.duelsWon + p.duelsLost
      const wr = t > 0 ? Math.round((p.duelsWon / t) * 100) : 0
      return `${t} дуэлей · винрейт ${wr}%`
    }
    case 'gambler':
      return `${p.casinoGamesCount.toLocaleString('ru-RU')} игр в казино`
    case 'voice':
      return p.ranks.byMessages != null ? `#${p.ranks.byMessages} по активности` : 'Один из самых активных'
    case 'collector':
      return 'Собирает редкие предметы'
    case 'farmer':
      return `Серия фарма до ${p.maxFarmStreak} дней`
    case 'family':
      return p.marriage ? `В браке уже ${p.marriage.days} дн.` : 'Семьянин'
    case 'respected':
      return p.ranks.byReputation != null ? `#${p.ranks.byReputation} по уважению` : 'Уважаем сообществом'
    default:
      return 'Только начинает путь в Возне'
  }
}

/**
 * Play-style verdict — up to 2 short interpretive lines about HOW this player
 * plays, so the viewer reads a conclusion instead of a stat table.
 */
export function playStyle(p: PlayerProfile): string[] {
  const lines: string[] = []
  const duelsTotal = p.duelsWon + p.duelsLost
  const winRate = duelsTotal > 0 ? p.duelsWon / duelsTotal : 0

  // Дуэльный темперамент.
  if (duelsTotal >= 10) {
    if (winRate >= 0.6) lines.push('Грозный дуэлянт — побеждает чаще, чем проигрывает.')
    else if (winRate >= 0.45) lines.push('Боец на равных — дуэли идут размен на размен.')
    else lines.push('Рисковый боец — проигрывает, но не уходит с арены.')
  }

  // Экономический темперамент: трата vs заработок.
  if (p.totalEarned >= 5_000) {
    const burn = p.totalEarned > 0 ? p.totalSpent / p.totalEarned : 0
    if (burn >= 0.8) lines.push('Транжира — пускает в оборот почти всё, что зарабатывает.')
    else if (burn <= 0.3) lines.push('Скопидом — копит больше, чем тратит.')
  }

  // Азарт.
  if (p.casinoGamesCount >= 50) lines.push('Завсегдатай казино — игре предпочитает удачу.')

  // Постоянство.
  if (p.maxFarmStreak >= 30) lines.push('Железная дисциплина — фармит без пропусков неделями.')

  // Голос.
  if (p.ranks.byMessages != null && p.ranks.byMessages <= 20) lines.push('Душа чата — один из самых громких голосов сообщества.')

  return lines.slice(0, 2)
}
