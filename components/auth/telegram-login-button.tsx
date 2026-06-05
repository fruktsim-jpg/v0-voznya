'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Branded Возня login button.
 *
 * ALWAYS renders as a native Возня pill ("🔐 Войти через Telegram") — the
 * standard Telegram Login Widget iframe is never shown, so the header keeps the
 * site's visual style. Clicking opens Telegram's OFFICIAL verified auth popup
 * via `window.Telegram.Login.auth({ bot_id })`; on success the signed payload is
 * forwarded to the EXISTING `/api/auth/telegram` route, which owns all HMAC
 * verification and session issuing. None of that changes here.
 *
 * The numeric `bot_id` (public — it's only the id before ":" in the token) is
 * resolved in order:
 *   1. `botId` prop (derived server-side from TELEGRAM_BOT_TOKEN in the layout),
 *   2. NEXT_PUBLIC_TELEGRAM_BOT_ID env (explicit override).
 * The site domain must be registered in @BotFather via /setdomain.
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

interface TelegramLoginButtonProps {
  /** Public numeric bot id, resolved server-side from the bot token. */
  botId?: string | null
}

export function TelegramLoginButton({ botId: botIdProp }: TelegramLoginButtonProps = {}) {
  const botId = botIdProp || process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || null
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  // Load the official widget script so window.Telegram.Login is available.
  useEffect(() => {
    if (!botId) return

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

  // Login not configured at all — render nothing so the UI degrades gracefully.
  if (!botId) {
    return null
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={!ready || busy}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? '⏳' : '🔐'}
      <span className="hidden sm:inline">{busy ? 'Входим…' : 'Войти через Telegram'}</span>
      <span className="sm:hidden">{busy ? 'Входим…' : 'Войти'}</span>
    </button>
  )
}
