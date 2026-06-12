'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ItemArt } from '@/components/ds/item-art'
import { toInvItems, type InvItem } from '@/lib/inventory-meta'
import { useShowcase } from '@/hooks/use-inventory-prefs'
import type { InventoryItem } from '@/lib/inventory-list'

/**
 * ProfileShowcase (Track 1 — surfacing) — РЕНДЕРИТ витрину закреплённых
 * предметов на ПРОФИЛЕ. Раньше InventoryShowcase задумывался «для профиля и
 * карточки игрока» (см. его docstring), но нигде на профиле не рендерился —
 * витрина жила только внутри /inventory. Здесь — read-only версия: показываем
 * закреплённые предметы владельца его же глазами.
 *
 * Пины живут в localStorage (use-inventory-prefs), поэтому витрину видит только
 * сам владелец на своём профиле (isOwner). Данные инвентаря тянем из того же
 * API, что и страница инвентаря. Если пинов нет — секция не показывается
 * (никакого пустого места на чужой вкус).
 */
export function ProfileShowcase() {
  const showcase = useShowcase()
  const [items, setItems] = useState<InvItem[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/inventory')
      .then((r) => (r.ok ? (r.json() as Promise<{ items: InventoryItem[] }>) : Promise.reject()))
      .then((data) => {
        if (alive) setItems(toInvItems(data.items ?? []))
      })
      .catch(() => {
        if (alive) setItems([])
      })
    return () => {
      alive = false
    }
  }, [])

  if (!items) return null
  // Сохраняем порядок закрепления игрока.
  const pinned = showcase.pinned
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is InvItem => Boolean(i))

  if (pinned.length === 0) return null

  return (
    <section id="showcase" className="mx-auto max-w-2xl px-4 sm:px-0">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-sm font-bold text-foreground">📌 Витрина</h2>
        <Link href="/inventory" className="text-[11px] text-muted-foreground hover:text-foreground">
          изменить →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {pinned.map((i) => (
          <Link
            key={i.id}
            href="/inventory"
            className="flex w-full flex-col items-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 transition active:scale-[0.97]"
            title={i.name}
          >
            <ItemArt code={i.code} itemClass={i.itemClass} glyph={i.glyph} rarity={i.rarity} size="md" />
            <span className="line-clamp-1 w-full text-center text-[10px] font-medium text-foreground">
              {i.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
