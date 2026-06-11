'use client'

/**
 * Toast system (A1 Motion System) — platform notifications.
 *
 * Wraps `sonner` (already a dependency) with VOZNYA's dark theme + tokens so
 * "something happened to me" can surface as a lightweight, non-blocking moment
 * (a rival passed you, a gift arrived, a claim is ready) WITHOUT a full
 * celebration takeover. Big moments use the Celebration system (A3); small ones
 * use this.
 *
 * Mounted once in the shell. Import { toast } from here so callers don't depend
 * on sonner directly (keeps the dep swappable).
 */

import { Toaster as SonnerToaster, toast } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      theme="dark"
      richColors={false}
      closeButton={false}
      toastOptions={{
        style: {
          background: 'rgba(16,16,20,0.92)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'var(--foreground)',
          backdropFilter: 'blur(12px)',
          borderRadius: '14px',
        },
        className: 'font-sans',
      }}
    />
  )
}

export { toast }
