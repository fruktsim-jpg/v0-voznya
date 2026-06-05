'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export function ProfileBreadcrumb({ playerName }: { playerName: string }) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Link 
        href="/live" 
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>Главная</span>
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground">{playerName}</span>
    </nav>
  )
}
