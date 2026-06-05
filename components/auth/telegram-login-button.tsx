'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Branded Возня login button.
 *
 * Visually this is a native Возня pill (matches the header "Статистика" button)
 * instead of Telegram's off-brand iframe widget. Functionally it still uses the
 * OFFICIAL Telegram widget script: clicking opens Telegram's verified auth popup
 * via `window.Telegram.Login.auth(...)`. On success Telegram hands us the signed
 * login payload, which we forward to the EXISTING `/api/auth/telegram` GET route
 * (same params Telegram's redirect mode would have produced). That route owns all
 * HMAC verification and session issuing — none of which changes here.
 *
 * Requires NEXT_PUBLIC_TELEGRAM_BOT_ID (the integer before ":" in the bot token —
 * public, safe to expose) and the site domain registered in @BotFather via
 * /setdomain. Without the env var the control degrades to nothing.
 */

type TelegramAuthData = Record<string, string | number | undefined>

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          options: { bot_id: string; request_access?: string | boolean; lang?: string },
          callback: (data: TelegramAuthData | false | null) => void,
        ) => void
      }
    }
  }
}

const WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22'

export function TelegramLoginButton() {
  const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!botId) return

    // Reuse the widget script if it's already on the page.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SRC}"]`,
    )
    if (existing) {
      if (window.Telegram?.Login) {
        setReady(true)
      } else {
        existing.addEventListener('load', () => setReady(true), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true
    script.onload = () => setReady(true)
    document.body.appendChild(script)
  }, [botId])

  const handleLogin = useCallback(() => {
    if (!botId || !window.Telegram?.Login) return
    setBusy(true)
    window.Telegram.Login.auth(
      { bot_id: botId, request_access: 'write' },
      (data) => {
        if (!data) {
          // User cancelled or closed the popup.
          setBusy(false)
          return
        }
        // Forward only the fields Telegram signed (skip empties) so the HMAC
        // the server recomputes matches exactly.
        const params = new URLSearchParams()
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value))
          }
        })
        window.location.href = `/api/auth/telegram?${params.toString()}`
      },
    )
  }, [botId])

  if (!botId) {
    // Login not configured — render nothing so the UI degrades gracefully.
    return null
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={!ready || busy}
      className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? '⏳ Входим…' : '🔐 Войти через Telegram'}
    </button>
  )
}
