'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Branded Возня login control with a safe fallback.
 *
 * Two modes, chosen automatically from env so the button is NEVER hidden when
 * login is configured:
 *
 *  1. Branded popup (preferred) — when NEXT_PUBLIC_TELEGRAM_BOT_ID is set.
 *     Renders a native Возня pill; clicking opens Telegram's OFFICIAL verified
 *     auth popup via `window.Telegram.Login.auth({ bot_id })`.
 *
 *  2. Official widget fallback — when only NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is
 *     set. Renders Telegram's standard Login Widget. Less on-brand, but it keeps
 *     login working without requiring the newer BOT_ID env var.
 *
 * In BOTH modes the signed payload goes to the EXISTING `/api/auth/telegram`
 * route, which owns all HMAC verification and session issuing. None of that
 * changes here. The site domain must be registered in @BotFather via /setdomain.
 *
 * Only when NEITHER env var is configured does the control render nothing.
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
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  // Popup mode requires the numeric bot id; otherwise fall back to the widget.
  const usePopup = Boolean(botId)

  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)

  // Popup mode: load the widget script so window.Telegram.Login is available.
  useEffect(() => {
    if (!usePopup) return

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
  }, [usePopup])

  // Fallback mode: inject the official Telegram Login Widget (redirect mode).
  useEffect(() => {
    if (usePopup || !botUsername) return
    const container = widgetRef.current
    if (!container || container.querySelector('script')) return

    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-auth-url', '/api/auth/telegram')
    container.appendChild(script)
  }, [usePopup, botUsername])

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

  // Neither configured — nothing to render.
  if (!botId && !botUsername) {
    return null
  }

  // Fallback: official Telegram widget.
  if (!usePopup) {
    return <div ref={widgetRef} className="inline-flex min-h-[40px] items-center" />
  }

  // Preferred: branded popup button.
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
