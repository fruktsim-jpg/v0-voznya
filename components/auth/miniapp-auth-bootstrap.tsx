'use client'

import { useEffect, useMemo, useState } from 'react'

type TelegramWebAppWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string
      ready?: () => void
      expand?: () => void
    }
  }
}

const AUTH_ATTEMPT_KEY = 'voznya-miniapp-auth-attempted'

type MiniAppAuthBootstrapProps = {
  nextPath: string
}

function safeNextPath(value: string): string {
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  return value
}

export function MiniAppAuthBootstrap({ nextPath }: MiniAppAuthBootstrapProps) {
  const target = useMemo(() => safeNextPath(nextPath), [nextPath])
  const [status, setStatus] = useState<'loading' | 'failed'>('loading')

  useEffect(() => {
    const webApp = (window as TelegramWebAppWindow).Telegram?.WebApp
    webApp?.ready?.()
    webApp?.expand?.()

    const initData = webApp?.initData || ''
    if (!initData) {
      setStatus('failed')
      return
    }

    const attemptKey = `${AUTH_ATTEMPT_KEY}:${target}`
    if (sessionStorage.getItem(attemptKey) === '1') {
      setStatus('failed')
      return
    }
    sessionStorage.setItem(attemptKey, '1')

    let cancelled = false

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .then((current) => {
        if (cancelled) return null
        if (current?.authenticated) {
          sessionStorage.removeItem(attemptKey)
          window.location.replace(target)
          return null
        }
        return fetch('/api/auth/telegram-webapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })
      })
      .then((response) => {
        if (cancelled || !response) return
        if (response.ok) {
          sessionStorage.removeItem(attemptKey)
          window.location.replace(target)
          return
        }
        setStatus('failed')
      })
      .catch(() => {
        if (!cancelled) setStatus('failed')
      })

    return () => {
      cancelled = true
    }
  }, [target])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-6 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-2xl">
          {status === 'loading' ? '🔐' : '⚠️'}
        </div>
        <h1 className="text-lg font-semibold">
          {status === 'loading' ? 'Входим через Telegram' : 'Не удалось войти'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === 'loading'
            ? 'Проверяем Mini App и открываем нужный раздел Возни.'
            : 'Открой раздел из Telegram ещё раз или войди через кнопку на сайте.'}
        </p>
      </div>
    </main>
  )
}
