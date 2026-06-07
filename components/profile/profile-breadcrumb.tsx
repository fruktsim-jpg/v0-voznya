'use client'

import Link from 'next/link'
import { ChevronRight, Activity } from 'lucide-react'

/**
 * Единственный элемент возврата на странице профиля (раньше дублировался
 * кнопкой «Назад к рейтингам»). Ведёт на /live — поэтому и подпись «Статистика»,
 * а не «Главная» (главная — это /).
 */
export function ProfileBreadcrumb({ playerName }: { playerName: string }) {
  return (
    <nav className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
      <Link
        href="/live"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Activity className="h-4 w-4" />
        <span>Статистика</span>
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="truncate text-foreground">{playerName}</span>
    </nav>
  )
}


