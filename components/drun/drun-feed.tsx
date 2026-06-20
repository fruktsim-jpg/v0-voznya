'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Glyph } from '@/components/ds/icon/glyph'
import { timeAgo } from '@/lib/events'
import type { DrunFeedItem } from '@/lib/drun-feed'

/**
 * Public "Друн говорит" feed (Phase A — Drun public presence).
 *
 * Read-only stream of Drun's self-standing utterances (ai_messages channel='web'),
 * newest first, with infinite scroll. Shows ONLY the message + relative time — no
 * trigger metadata, no moderation, no admin controls. Player-facing.
 *
 * First page is server-rendered (`initial`); older pages are fetched from
 * `/api/drun?before=<id>` as the sentinel scrolls into view. Degrades to a calm
 * empty state when Drun has not spoken yet.
 */

const PAGE = 20

export function DrunFeed({ initial }: { initial: DrunFeedItem[] }) {
  const [items, setItems] = useState<DrunFeedItem[]>(initial)
  const [done, setDone] = useState(initial.length < PAGE)
  const [loading, setLoading] = useState(false)
  const sentinel = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || done) return
    const last = items[items.length - 1]
    if (!last) {
      setDone(true)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE),
        before: last.id,
        beforeTs: last.createdAt,
      })
      const res = await fetch(`/api/drun?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = (await res.json()) as { items?: DrunFeedItem[] }
      const next = data.items ?? []
      setItems((prev) => {
        // De-dupe by id in case of overlap at the cursor boundary.
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...next.filter((i) => !seen.has(i.id))]
      })
      if (next.length < PAGE) setDone(true)
    } catch {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }, [items, loading, done])

  useEffect(() => {
    const el = sentinel.current
    if (!el || done) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '400px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore, done])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Glyph name="moon" className="text-2xl text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Друн пока молчит. Он наблюдает за Возней и заговорит, когда будет повод.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2.5 px-4">
      {items.map((it) => (
        <article
          key={it.id}
          className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
            {it.content}
          </p>
          <time
            dateTime={it.createdAt}
            className="text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            {timeAgo(it.createdAt)}
          </time>
        </article>
      ))}

      {!done && (
        <div ref={sentinel} className="py-4 text-center text-xs text-muted-foreground">
          {loading ? 'Загрузка…' : ' '}
        </div>
      )}
    </div>
  )
}
