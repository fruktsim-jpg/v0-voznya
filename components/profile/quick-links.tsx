'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, Calendar, Users, BarChart3 } from 'lucide-react'

export function QuickLinks() {
  const links = [
    {
      href: '/live#top-rich',
      icon: TrendingUp,
      label: 'Топ богачей',
      description: 'Самые богатые игроки'
    },
    {
      href: '/live#top-weekly',
      icon: Calendar,
      label: 'Топ недели',
      description: 'Лучшие за 7 дней'
    },
    {
      href: '/live#families',
      icon: Users,
      label: 'Семьи',
      description: 'Рейтинг браков'
    },
    {
      href: '/live',
      icon: BarChart3,
      label: 'Главная статистика',
      description: 'Общая статистика'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="mt-8 glass rounded-2xl border border-border p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        🔗 Быстрые переходы
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <link.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {link.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {link.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}
