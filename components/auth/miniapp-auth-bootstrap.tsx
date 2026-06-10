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

type DebugStep = {
  step: string
  detail: string
}

function safeNextPath(value: string): string {
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  return value
}

export function MiniAppAuthBootstrap({ nextPath }: MiniAppAuthBootstrapProps) {
  const target = useMemo(() => safeNextPath(nextPath), [nextPath])
  const [status, setStatus] = useState<'loading' | 'failed'>('loading')
  const [debug, setDebug] = useState<DebugStep[]>([])

  function addDebug(step: string, detail: string) {
    setDebug((items) => [...items, { step, detail }])
    console.info(`[miniapp-auth] ${step}: ${detail}`)
  }

  useEffect(() => {
    const webApp = (window as TelegramWebAppWindow).Telegram?.WebApp
    webApp?.ready?.()
    webApp?.expand?.()

    const initData = webApp?.initData || ''
    addDebug('webapp.detect', webApp ? 'Telegram.WebApp present' : 'Telegram.WebApp missing')
    addDebug('initData.present', initData ? `yes length=${initData.length}` : 'no')
    if (!initData) {
      setStatus('failed')
      return
    }

    const attemptKey = `${AUTH_ATTEMPT_KEY}:${target}`
    if (sessionStorage.getItem(attemptKey) === '1') {
      addDebug('attempt.guard', `already attempted for ${target}`)
      setStatus('failed')
      return
    }
    sessionStorage.setItem(attemptKey, '1')
    addDebug('attempt.start', target)

    let cancelled = false

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => {
        addDebug('auth.me.response', `status=${response.status}`)
        return response.ok ? response.json() : { authenticated: false }
      })
      .then((current) => {
        if (cancelled) return null
        addDebug('auth.me.state', current?.authenticated ? 'authenticated' : 'not authenticated')
        if (current?.authenticated) {
          sessionStorage.removeItem(attemptKey)
          window.location.replace(target)
          return null
        }
        addDebug('webapp.request', 'POST /api/auth/telegram-webapp')
        return fetch('/api/auth/telegram-webapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })
      })
      .then(async (response) => {
        if (cancelled || !response) return
        let payload: unknown = null
        try {
          payload = await response.json()
        } catch {
          payload = null
        }
        addDebug(
          'webapp.response',
          `status=${response.status} body=${JSON.stringify(payload)}`,
        )
        if (response.ok) {
          sessionStorage.removeItem(attemptKey)
          addDebug('cookie.check', 'GET /api/auth/me after Set-Cookie')
          const cookieCheck = await fetch('/api/auth/me', { cache: 'no-store' })
          const cookiePayload = cookieCheck.ok ? await cookieCheck.json() : null
          addDebug(
            'cookie.visible',
            `status=${cookieCheck.status} authenticated=${Boolean(cookiePayload?.authenticated)}`,
          )
          if (cookiePayload?.authenticated) {
            addDebug('redirect', target)
            window.location.replace(target)
            return
          }
          setStatus('failed')
          return
        }
        setStatus('failed')
      })
      .catch(() => {
        if (!cancelled) {
          addDebug('exception', 'fetch failed')
          setStatus('failed')
        }
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
        {status === 'failed' && debug.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-background/70 p-3 text-left text-[11px] text-muted-foreground">
            <div className="mb-1 font-semibold text-foreground">Mini App debug</div>
            {debug.map((item, index) => (
              <div key={`${item.step}-${index}`} className="break-words">
                <span className="font-mono text-foreground">{item.step}</span>: {item.detail}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
