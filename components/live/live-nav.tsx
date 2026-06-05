'use client'

import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'top-rich', label: '💰 Богачи' },
  { id: 'top-weekly', label: '📅 Неделя' },
  { id: 'families', label: '💍 Семьи' },
  { id: 'achievements', label: '🏆 Ачивки' },
  { id: 'titles', label: '👑 Титулы' },
]

export function LiveNav() {
  const [active, setActive] = useState<string>('top-rich')

  useEffect(() => {
    const handleScroll = () => {
      // Find the section whose top is closest to (but above) the viewport top + offset
      let current = SECTIONS[0].id
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= 120) {
          current = section.id
        }
      }
      setActive(current)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.pageYOffset - 16
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              active === section.id
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  )
}
