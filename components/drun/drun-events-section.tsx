import { Glyph } from '@/components/ds/icon'
import type { DrunEventsBoard, DrunEventItem } from '@/lib/drun-events'
import { timeAgo } from '@/lib/events'

const KIND_LABEL: Record<string, string> = {
  challenge: 'челлендж',
  prediction: 'прогноз',
  mini_event: 'мини-ивент',
  mini: 'мини-ивент',
  goal: 'цель чата',
}

function rewardText(amount: number | null): string {
  if (!amount || amount <= 0) return 'без банка'
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ешек`
}

function deadlineText(iso: string | null): string {
  if (!iso) return 'без дедлайна'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'дедлайн наступил'
  const min = Math.ceil(diff / 60_000)
  if (min < 60) return `${min} мин осталось`
  const h = Math.ceil(min / 60)
  if (h < 24) return `${h} ч осталось`
  return `${Math.ceil(h / 24)} дн осталось`
}

function EventCard({ ev }: { ev: DrunEventItem }) {
  return (
    <article className="glass relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-400/[0.06] to-transparent p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/10 text-violet-200">
          <Glyph name="target" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
              {KIND_LABEL[ev.kind] ?? ev.kind}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              #{ev.id} · {timeAgo(ev.createdAt)}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-foreground">{ev.title}</h3>
          {ev.body && (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {ev.body}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1">
              <Glyph name="coin" className="h-3 w-3 text-amber-300" />
              {rewardText(ev.rewardAmount)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1">
              <Glyph name="users" className="h-3 w-3 text-sky-300" />
              {ev.participantCount} участн.
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1">
              <Glyph name="season" className="h-3 w-3 text-violet-300" />
              {deadlineText(ev.deadlineAt)}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Вступить из Telegram: <code className="rounded bg-white/[0.06] px-1.5 py-0.5">/join {ev.id}</code>
          </p>
        </div>
      </div>
    </article>
  )
}

export function DrunEventsSection({ data }: { data: DrunEventsBoard }) {
  if (!data.hasContent) return null
  return (
    <section className="mx-auto mt-4 max-w-2xl px-4 sm:mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Glyph name="target" className="h-4 w-4 text-primary" />
        <h2 className="section-title text-base text-foreground sm:text-lg">Ивенты друна</h2>
        <span className="text-[11px] text-muted-foreground">· движ, который он запустил</span>
      </div>
      <div className="space-y-3">
        {data.items.map((ev) => (
          <EventCard key={ev.id} ev={ev} />
        ))}
      </div>
    </section>
  )
}
