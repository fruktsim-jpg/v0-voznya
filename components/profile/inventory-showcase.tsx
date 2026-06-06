'use client'

import { motion } from 'framer-motion'
import { rarityStyle, typeEmoji, RARITY_STYLES } from '@/lib/inventory'
import type { InventoryItemView } from '@/lib/queries'

interface InventoryShowcaseProps {
  // Сами предметы (read-only). Витрина показывается только когда их > 0.
  items: InventoryItemView[]
  totalItems: number
  uniqueItems: number
  // delay для согласованной анимации появления внутри карточки профиля.
  delay?: number
}

/**
 * Read-only витрина инвентаря игрока на сайте. Только показ: выдача/обмен
 * предметов идёт через бота/админку, сайт ничего не пишет. Сортировка —
 * экипированные выше, затем по редкости (реже выше), затем по имени, чтобы
 * совпадать с порядком в боте (app/features/inventory/service.py).
 */
export function InventoryShowcase({
  items,
  totalItems,
  uniqueItems,
  delay = 0.2,
}: InventoryShowcaseProps) {
  if (items.length === 0) return null

  const sorted = [...items].sort((a, b) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1
    const ra = rarityStyle(a.rarity).order
    const rb = rarityStyle(b.rarity).order
    if (ra !== rb) return rb - ra
    return a.name.localeCompare(b.name, 'ru')
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-3 sm:mt-6"
    >
      <div className="glass rounded-2xl border border-border p-4 sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            🎒
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">Инвентарь</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {uniqueItems.toLocaleString('ru-RU')} видов · {totalItems.toLocaleString('ru-RU')}{' '}
              предметов
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          {sorted.map((item, index) => {
            const style = rarityStyle(item.rarity)
            return (
              <motion.div
                key={item.itemCode}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + index * 0.03 }}
                className={`relative flex items-start gap-3 rounded-xl border p-3 ${style.className}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/20 text-xl">
                  {typeEmoji(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground sm:text-base">
                      {item.name}
                    </span>
                    {item.quantity > 1 && (
                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                        ×{item.quantity}
                      </span>
                    )}
                    {item.equipped && (
                      <span className="shrink-0 rounded-full border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        надето
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                    {style.label}
                  </div>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// Re-export для удобства потребителей, которым нужен справочник редкостей.
export { RARITY_STYLES }
