'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Branded Возня login button.
 *
 * ALWAYS renders as a native Возня pill ("🔐 Войти через Telegram") — the
 * standard Telegram Login Widget iframe is never embedded, so the header keeps
 * the site's visual style. Two flows behind the same button:
 *
 *  - OIDC (preferred, when `oidcEnabled`): navigates to
 *    `/api/auth/telegram/oidc/start`, which runs the OpenID Connect
 *    Authorization Code + PKCE flow against oauth.telegram.org and issues the
 *    normal Возня session on callback.
 *
 *  - Classic fallback (when OIDC is off but `botId` is set): opens Telegram's
 *    OFFICIAL verified auth popup via `window.Telegram.Login.auth({ bot_id })`
 *    and forwards the signed payload to the EXISTING `/api/auth/telegram` route.
 *
 * Both flows reuse the same session layer — no DB/JWT/cookie changes here.
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
const OIDC_START_PATH = '/api/auth/telegram/oidc/start'

interface TelegramLoginButtonProps {
  /** Public numeric bot id (classic fallback), resolved server-side from token. */
  botId?: string | null
  /** When true, the button starts the OIDC flow instead of the classic popup. */
  oidcEnabled?: boolean
}

export function TelegramLoginButton({
  botId: botIdProp,
  oidcEnabled = false,
}: TelegramLoginButtonProps = {}) {
  const botId = botIdProp || process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || null
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  // Classic fallback only: load the widget script so window.Telegram.Login works.
  useEffect(() => {
    if (oidcEnabled || !botId) return

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
  }, [oidcEnabled, botId])

  const handleClassicLogin = useCallback(() => {
    if (!botId || !window.Telegram?.Login) return
    setBusy(true)
    window.Telegram.Login.auth(
      { bot_id: botId, request_access: 'write' },
      (data) => {
        if (!data) {
          setBusy(false)
          return
        }
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

  const handleClick = useCallback(() => {
    if (oidcEnabled) {
      setBusy(true)
      window.location.href = OIDC_START_PATH
      return
    }
    handleClassicLogin()
  }, [oidcEnabled, handleClassicLogin])

  // OIDC mode is always actionable; classic mode waits for the widget script.
  const disabled = busy || (!oidcEnabled && !ready)

  // Nothing to render only when neither flow is available.
  if (!oidcEnabled && !botId) {
    return null
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? '⏳' : '🔐'}
      <span className="hidden sm:inline">{busy ? 'Входим…' : 'Войти через Telegram'}</span>
      <span className="sm:hidden">{busy ? 'Входим…' : 'Войти'}</span>
    </button>
  )
}
