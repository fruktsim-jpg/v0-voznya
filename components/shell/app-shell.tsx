import type { ReactNode } from 'react'
import { UnifiedShell } from '@/components/shell/unified-shell'
import { GlobalNav } from '@/components/shell/global-nav'
import { PlatformProviders } from '@/components/shell/platform-providers'
import { WorldBackdrop } from '@/components/shell/world-backdrop'

/**
 * AppShell (Redesign — Phase E0.1) — the Mini-App wrapper. ONE fixed top bar
 * (UnifiedShell) + the config-driven GlobalNav. This replaced the old
 * SiteHeader + PlayerContextBar pair (two stacked fixed bars + a
 * `has-context-bar` body-class hand-syncing their heights). Now:
 *
 *  - UnifiedShell — the single scroll-aware bar; owns brand, stats, and the
 *    §3e chrome cluster (avatar + balance + one rank pill). It transforms
 *    between idle/condensed; it never splits into a second strip.
 *  - GlobalNav — config navigation (bottom bar / desktop pill), hidden in admin.
 *  - top clearance comes from each page's `.pt-header` / `.pt-hero-safe`, which
 *    now derive from the single `--shell-*` token contract (globals.css).
 *  - bottom `pb-16 sm:pb-0` keeps content clear of the mobile GlobalNav.
 *
 * Pure presentational layer: data / routes / contracts are untouched.
 */
export function AppShell({
  children,
  botId,
  oidcEnabled,
}: {
  children: ReactNode
  botId?: string | null
  oidcEnabled?: boolean
}) {
  return (
    <>
      <WorldBackdrop />
      <UnifiedShell botId={botId} oidcEnabled={oidcEnabled} />

      {/* Bottom padding on mobile so content isn't hidden under GlobalNav. */}
      <PlatformProviders>
        <div className="pb-16 sm:pb-0">{children}</div>
      </PlatformProviders>

      <GlobalNav />
    </>
  )
}
