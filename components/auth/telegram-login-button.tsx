'use client'

import { useEffect, useRef } from 'react'

/**
 * Telegram Login Widget (redirect mode).
 *
 * Injects the official telegram.org widget script. On success Telegram
 * redirects to `data-auth-url` (our /api/auth/telegram route), which verifies
 * the payload and sets the session cookie.
 *
 * Requires NEXT_PUBLIC_TELEGRAM_BOT_USERNAME and the site domain registered in
 * @BotFather via /setdomain — otherwise the widget will not render.
 */
export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null)
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

  useEffect(() => {
    const container = containerRef.current
    if (!container || !botUsername) return

    // Avoid double-injecting on re-render.
    if (container.querySelector('script')) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-auth-url', '/api/auth/telegram')
    container.appendChild(script)
  }, [botUsername])

  if (!botUsername) {
    // Login not configured — render nothing so the UI degrades gracefully.
    return null
  }

  return <div ref={containerRef} className="inline-flex min-h-[40px] items-center" />
}
