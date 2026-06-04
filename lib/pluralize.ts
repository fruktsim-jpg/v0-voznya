/**
 * Pluralization utilities for Russian language.
 * Mirrors the bot's склонение logic (app/core/money.py).
 */

/**
 * Returns the correct plural form based on the number.
 * 
 * @param n - The number to pluralize for
 * @param one - Form for 1 (e.g., "ешка", "день", "победа")
 * @param few - Form for 2-4 (e.g., "ешки", "дня", "победы")
 * @param many - Form for 5+ (e.g., "ешек", "дней", "побед")
 * 
 * @example
 * pluralize(1, "ешка", "ешки", "ешек") // "ешка"
 * pluralize(2, "ешка", "ешки", "ешек") // "ешки"
 * pluralize(5, "ешка", "ешки", "ешек") // "ешек"
 * pluralize(21, "ешка", "ешки", "ешек") // "ешка"
 */
export function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  const mod10 = abs % 10
  const mod100 = abs % 100

  // Special cases: 11-14 always use "many" form
  if (mod100 >= 11 && mod100 <= 14) {
    return many
  }

  // 1, 21, 31, ... → one
  if (mod10 === 1) {
    return one
  }

  // 2-4, 22-24, 32-34, ... → few
  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }

  // 0, 5-20, 25-30, ... → many
  return many
}

/**
 * Formats currency amount with proper pluralization.
 * 
 * @param amount - The amount of eshkas
 * @param withNumber - Whether to include the number (default: true)
 * 
 * @example
 * formatCurrency(1) // "1 ешка"
 * formatCurrency(2) // "2 ешки"
 * formatCurrency(5) // "5 ешек"
 * formatCurrency(21) // "21 ешка"
 * formatCurrency(111) // "111 ешек"
 * formatCurrency(5, false) // "ешек"
 */
export function formatCurrency(amount: number, withNumber = true): string {
  const formatted = amount.toLocaleString('ru-RU')
  const word = pluralize(amount, 'ешка', 'ешки', 'ешек')
  return withNumber ? `${formatted} ${word}` : word
}

/**
 * Formats days with proper pluralization.
 * 
 * @example
 * formatDays(1) // "1 день"
 * formatDays(2) // "2 дня"
 * formatDays(5) // "5 дней"
 * formatDays(21) // "21 день"
 */
export function formatDays(days: number, withNumber = true): string {
  const formatted = days.toLocaleString('ru-RU')
  const word = pluralize(days, 'день', 'дня', 'дней')
  return withNumber ? `${formatted} ${word}` : word
}

/**
 * Formats wins/victories with proper pluralization.
 * 
 * @example
 * formatWins(1) // "1 победа"
 * formatWins(2) // "2 победы"
 * formatWins(5) // "5 побед"
 */
export function formatWins(wins: number, withNumber = true): string {
  const formatted = wins.toLocaleString('ru-RU')
  const word = pluralize(wins, 'победа', 'победы', 'побед')
  return withNumber ? `${formatted} ${word}` : word
}

/**
 * Formats treasures with proper pluralization.
 * 
 * @example
 * formatTreasures(1) // "1 клад"
 * formatTreasures(2) // "2 клада"
 * formatTreasures(5) // "5 кладов"
 */
export function formatTreasures(treasures: number, withNumber = true): string {
  const formatted = treasures.toLocaleString('ru-RU')
  const word = pluralize(treasures, 'клад', 'клада', 'кладов')
  return withNumber ? `${formatted} ${word}` : word
}

/**
 * Formats duels with proper pluralization.
 * 
 * @example
 * formatDuels(1) // "1 дуэль"
 * formatDuels(2) // "2 дуэли"
 * formatDuels(5) // "5 дуэлей"
 */
export function formatDuels(duels: number, withNumber = true): string {
  const formatted = duels.toLocaleString('ru-RU')
  const word = pluralize(duels, 'дуэль', 'дуэли', 'дуэлей')
  return withNumber ? `${formatted} ${word}` : word
}

/**
 * Formats farms with proper pluralization.
 * 
 * @example
 * formatFarms(1) // "1 ферма"
 * formatFarms(2) // "2 фермы"
 * formatFarms(5) // "5 ферм"
 */
export function formatFarms(farms: number, withNumber = true): string {
  const formatted = farms.toLocaleString('ru-RU')
  const word = pluralize(farms, 'ферма', 'фермы', 'ферм')
  return withNumber ? `${formatted} ${word}` : word
}

/**
 * Formats achievements with proper pluralization.
 * 
 * @example
 * formatAchievements(1) // "1 достижение"
 * formatAchievements(2) // "2 достижения"
 * formatAchievements(5) // "5 достижений"
 */
export function formatAchievements(achievements: number, withNumber = true): string {
  const formatted = achievements.toLocaleString('ru-RU')
  const word = pluralize(achievements, 'достижение', 'достижения', 'достижений')
  return withNumber ? `${formatted} ${word}` : word
}
