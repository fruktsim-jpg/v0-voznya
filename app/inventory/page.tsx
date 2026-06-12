import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { getInventory } from '@/lib/inventory-list'
import { InventoryClient } from '@/components/v2/inventory-client'
import { ScreenHeader } from '@/components/v2/screen-header'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Инвентарь — Возня',
  description: 'Твои предметы, Telegram Gifts и Premium. Храни, продавай или выводи.',
}

/**
 * Inventory (VOZNYA 2.2, P0/P2/P8 — website first) — the player's owned items as
 * full game objects, Steam-style. Server component: reads the SIGNED session and
 * loads the inventory against the shared DB, then hands off to the interactive
 * InventoryClient (Sell / Withdraw / Keep). Bot stays the manual-delivery
 * fallback; the site is the primary surface.
 */
export default async function InventoryPage() {
  const session = await getSession()
  if (!session) {
    redirect('/?auth=required')
  }

  if (!isDbConfigured()) {
    return (
      <main className="relative min-h-svh overflow-x-hidden">
        <ScreenHeader icon="inventory" title="Инвентарь" />
        <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Инвентарь временно недоступен.</p>
          </div>
        </div>
      </main>
    )
  }

  const view = await getInventory(session.uid)

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader
        icon="inventory"
        title="Инвентарь"
        kicker="Твоя коллекция"
        accent="indigo"
        action={
          <Link href="/cases" className="text-sm font-medium text-primary hover:underline">
            Кейсы
          </Link>
        }
      />
      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <InventoryClient initial={view.items} userId={session.uid} />
      </div>
    </main>
  )
}
