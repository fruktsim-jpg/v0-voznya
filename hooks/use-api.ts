'use client'

import { useEffect, useState } from 'react'

type State<T> = {
  data: T | null
  loading: boolean
  error: boolean
}

/**
 * Tiny client-side fetch hook with optional polling for the live dashboard.
 * Never returns fake data — on failure it surfaces `error` so the UI can show
 * an honest "unavailable" state instead of placeholders.
 */
export function useApi<T>(url: string, pollMs = 0): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: false })

  useEffect(() => {
    let alive = true

    const load = () => {
      fetch(url)
        .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
        .then((data) => {
          if (alive) setState({ data, loading: false, error: false })
        })
        .catch(() => {
          if (alive) setState((prev) => ({ data: prev.data, loading: false, error: true }))
        })
    }

    load()
    let timer: ReturnType<typeof setInterval> | undefined
    if (pollMs > 0) timer = setInterval(load, pollMs)

    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [url, pollMs])

  return state
}
