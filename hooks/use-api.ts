'use client'

import { useEffect, useState } from 'react'

type State<T> = {
  data: T | null
  loading: boolean
  error: boolean
}

/**
 * Tiny client-side fetch hook with optional polling for the live dashboard.
 *
 * Stale-while-revalidate cache (perf): results are cached in-memory per URL for
 * the session, so navigating back to a page renders its last data INSTANTLY
 * (no skeleton flash, no perceived lag) while a fresh request revalidates in the
 * background. In-flight requests are de-duped so multiple components asking for
 * the same URL trigger one network call. Never returns fake data — on failure it
 * surfaces `error` so the UI can show an honest "unavailable" state.
 */
type CacheEntry = { data: unknown; ts: number }
const CACHE = new Map<string, CacheEntry>()
const INFLIGHT = new Map<string, Promise<unknown>>()

function fetchShared<T>(url: string): Promise<T> {
  const existing = INFLIGHT.get(url)
  if (existing) return existing as Promise<T>
  const p = fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
    .then((data) => {
      CACHE.set(url, { data, ts: Date.now() })
      return data
    })
    .finally(() => {
      INFLIGHT.delete(url)
    })
  INFLIGHT.set(url, p)
  return p as Promise<T>
}

export function useApi<T>(url: string, pollMs = 0): State<T> {
  const cached = CACHE.get(url)?.data as T | undefined
  const [state, setState] = useState<State<T>>({
    data: cached ?? null,
    loading: cached === undefined,
    error: false,
  })

  useEffect(() => {
    let alive = true

    // Show cached data immediately, then revalidate in the background.
    const seed = CACHE.get(url)?.data as T | undefined
    if (seed !== undefined) {
      setState({ data: seed, loading: false, error: false })
    }

    const load = () => {
      fetchShared<T>(url)
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
