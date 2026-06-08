// Economy constants mirrored 1:1 from the bot's app/settings/balance.py.
//
// These MUST stay in sync with the bot because the site and the bot mutate the
// SAME database with the SAME formulas (sell at 70%, internal value = stars ×
// 10). Keeping them in one module avoids magic numbers scattered across TS
// ports of sell_gift / inventory value math.
//
// If you change a value here, change it in app/settings/balance.py too.

// Курс конвертации Telegram Stars → ешки. Внутренняя стоимость предмета =
// star_cost × ESHKI_PER_STAR. (app/settings/balance.py: ESHKI_PER_STAR)
export const ESHKI_PER_STAR = 10

// Доля внутренней стоимости, которую игрок получает при ПРОДАЖЕ предмета.
// 0.70 = 70%. (app/settings/balance.py: ITEM_SELL_RATE)
export const ITEM_SELL_RATE = 0.7
