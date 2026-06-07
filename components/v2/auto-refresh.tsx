'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * AutoRefresh — тихо обновляет серверные данные страницы (router.refresh) с
 * заданным интервалом, чтобы Live ощущался живым без websocket/новых API.
 * Пауза, когда вкладка скрыта. Ничего не рендерит.
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
