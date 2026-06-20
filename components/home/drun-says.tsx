import Link from 'next/link'
import { Glyph } from '@/components/ds/icon/glyph'
import { timeAgo } from '@/lib/events'
import { getDrunFeed } from '@/lib/drun-feed'

/**
 * "Друн говорит" homepage widget (Phase A — Drun public presence).
 *
 * Compact glance at Drun's latest utterances so a FIRST-TIME visitor immediately
 * understands an AI persona lives in VOZNYA — without being told. Server
 * component, READ-ONLY, self-hides when Drun has not spoken yet (no empty box,
 * honest degradation). Links through to the full /drun feed.
 */
export async function DrunSays({ limit = 4 }: { limit?: number }) {
  const items = await getDrunFeed(limit)
  if (items.length === 0) return null

  return (
    <section className="mx-auto mt-4 max-w-5xl px-4 sm:px-6">
      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Glyph name="sparkles" className="text-violet-300" />
            <h2 className="text-sm font-semibold text-foreground">Друн говорит</h2>
          </div>
          <Link
            href="/drun"
            className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200 transition hover:bg-violet-500/20"
          >
            Все реплики →
          </Link>
        </div>

        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
                {it.content}
              </p>
              <time
                dateTime={it.createdAt}
                className="text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                {timeAgo(it.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
