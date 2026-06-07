import { Card } from '@/components/v2/card'
import { getCommunityStats, getEconomy } from '@/lib/queries'

/**
 * Community Pulse (V3) — масштаб сообщества крупными живыми цифрами на РЕАЛЬНЫХ
 * данных (getCommunityStats + getEconomy). Server component. Сохраняет ключевую
 * идентичность главной: «большое живое русскоязычное сообщество».
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

export async function CommunityPulse() {
  const [stats, economy] = await Promise.all([getCommunityStats(), getEconomy()])

  const items: { icon: string; value: number; label: string; accent?: boolean }[] = [
    { icon: '👥', value: stats.users, label: 'участников', accent: true },
    { icon: '🏆', value: stats.achievements, label: 'достижений' },
    { icon: '💍', value: stats.marriages, label: 'семей' },
    { icon: '🪙', value: stats.treasuresFound, label: 'кладов найдено' },
    { icon: '⚔️', value: stats.duels, label: 'дуэлей' },
    { icon: '💰', value: economy.treasury, label: 'ешек в обороте' },
  ]

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((it) => (
            <Card
              key={it.label}
              variant={it.accent ? 'epic' : 'default'}
              className="flex flex-col items-center gap-1 py-5 text-center"
            >
              <span className="text-2xl" aria-hidden="true">
                {it.icon}
              </span>
              <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {fmt(it.value)}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {it.label}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
