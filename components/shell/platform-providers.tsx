'use client'

/**
 * PlatformProviders (PHASE A) — the client-side premium-layer host mounted once
 * in the app shell. It owns the cross-cutting systems that must exist exactly
 * once in the tree:
 *
 *   - A1 Toaster        — lightweight "something happened" notifications.
 *   - A2 FxBootstrap    — registers platform sound cues + exposes FX (no-op
 *                          until assets ship; haptics work today).
 *   - A3 CelebrationHost — the full-screen moment layer (rank-up, mythic, etc.).
 *
 * Kept thin so the server `AppShell` stays a server component. Adding a system
 * here makes it available platform-wide without touching every page.
 */

import type { ReactNode } from 'react'
import { Toaster } from '@/components/ds/toast'
import { FxProvider } from '@/hooks/use-fx'
import { FxBootstrap } from '@/components/fx/fx-bootstrap'
import { CelebrationProvider } from '@/components/celebration/celebration-host'
import { TelegramProvider } from '@/components/shell/telegram-provider'

export function PlatformProviders({ children }: { children: ReactNode }) {
  return (
    <FxProvider>
      <TelegramProvider />
      <FxBootstrap />
      <CelebrationProvider>{children}</CelebrationProvider>
      <Toaster />
    </FxProvider>
  )
}
