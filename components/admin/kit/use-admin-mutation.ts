'use client'

import { useCallback, useState } from 'react'
import type { FeedbackMsg } from './feedback'

/**
 * useAdminMutation (CC Foundation) — the one client mutation hook for every
 * admin tool. Wraps fetch to /api/admin/*, normalizes error handling (401/403/
 * server error → readable message), exposes `busy` + a `{ ok, text }` feedback
 * message, and supports BOTH JSON and multipart (FormData) bodies.
 *
 *   const { run, busy, msg, setMsg } = useAdminMutation()
 *   await run('/api/admin/items', { method: 'POST', json: {...}, success: 'Создано' })
 *   await run('/api/admin/assets', { method: 'POST', form: fd, success: 'Загружено' })
 */

type RunOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  json?: unknown
  form?: FormData
  success?: string
}

export type AdminMutation = {
  busy: boolean
  msg: FeedbackMsg
  setMsg: (m: FeedbackMsg) => void
  /** Runs the request. Returns parsed data on success, or null on error. */
  run: <T = Record<string, unknown>>(url: string, opts?: RunOpts) => Promise<T | null>
}

function errorFor(status: number, body: { error?: string } | null): string {
  if (body?.error) return body.error
  if (status === 401) return 'Не авторизован'
  if (status === 403) return 'Недостаточно прав'
  if (status === 404) return 'Не найдено'
  return `Ошибка (${status})`
}

export function useAdminMutation(): AdminMutation {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<FeedbackMsg>(null)

  const run = useCallback(
    async <T,>(url: string, opts: RunOpts = {}): Promise<T | null> => {
      const { method = 'POST', json, form, success } = opts
      setBusy(true)
      setMsg(null)
      try {
        const init: RequestInit = { method }
        if (form) {
          init.body = form
        } else if (json !== undefined) {
          init.headers = { 'Content-Type': 'application/json' }
          init.body = JSON.stringify(json)
        }
        const res = await fetch(url, init)
        let data: unknown = null
        try {
          data = await res.json()
        } catch {
          data = null
        }
        if (!res.ok) {
          throw new Error(errorFor(res.status, data as { error?: string }))
        }
        if (success) setMsg({ ok: true, text: success })
        return (data as T) ?? null
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
        return null
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  return { busy, msg, setMsg, run }
}
