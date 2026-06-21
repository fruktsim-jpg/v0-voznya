import { Glyph, type GlyphName } from '@/components/ds/icon'
import type { DrunWorldview } from '@/lib/drun-worldview'

/**
 * "Хроники друна" — read-only worldview chronicle (Phase A).
 *
 * Renders the storylines / predictions / legends Drun's worldview loop already
 * wrote to `ai_memories`. Pure presentation over the `DrunWorldview` payload;
 * the page omits this entirely when `hasContent` is false, so the component only
 * ever sees content worth showing.
 */

const PRED_BADGE: Record<
  'open' | 'hit' | 'miss',
  { label: string; tone: string; glyph: GlyphName }
> = {
  open: { label: 'в силе', tone: 'border-sky-400/40 bg-sky-400/10 text-sky-200', glyph: 'target' },
  hit: { label: 'сбылось', tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200', glyph: 'check' },
  miss: { label: 'не сбылось', tone: 'border-rose-400/40 bg-rose-400/10 text-rose-200', glyph: 'flame' },
}

export function DrunWorldviewSection({ data }: { data: DrunWorldview }) {
  if (!data.hasContent) return null
  const { storylines, predictions, legends } = data

  return (
    <section className="mx-auto mt-4 max-w-2xl px-4 sm:mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Glyph name="book" className="h-4 w-4 text-primary" />
        <h2 className="section-title text-base text-foreground sm:text-lg">Хроники друна</h2>
        <span className="text-[11px] text-muted-foreground">· как он видит мир Возни</span>
      </div>

      <div className="space-y-3">
        {/* Storylines — ongoing arcs Drun is tracking. */}
        {storylines.length > 0 && (
          <div className="glass rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent p-4 sm:p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <Glyph name="pulse" className="h-3.5 w-3.5 text-primary" />
              <span className="label-eyebrow">Сюжеты в развитии</span>
            </div>
            <ul className="space-y-2">
              {storylines.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Predictions — dated calls, with outcome once resolved. */}
        {predictions.length > 0 && (
          <div className="glass rounded-2xl border border-border p-4 sm:p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <Glyph name="target" className="h-3.5 w-3.5 text-sky-300" />
              <span className="label-eyebrow">Прогнозы друна</span>
            </div>
            <ul className="space-y-2">
              {predictions.map((p) => {
                const b = PRED_BADGE[p.status]
                return (
                  <li
                    key={p.id}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-white/[0.02] px-3 py-2"
                  >
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.tone}`}
                    >
                      <Glyph name={b.glyph} className="h-2.5 w-2.5" />
                      {b.label}
                    </span>
                    <span className="text-[13px] leading-relaxed text-foreground/90">{p.text}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Legends — enshrined myths, no expiry. */}
        {legends.length > 0 && (
          <div className="glass rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.06] to-transparent p-4 sm:p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <Glyph name="crown" className="h-3.5 w-3.5 text-amber-300" />
              <span className="label-eyebrow">Легенды чата</span>
            </div>
            <ul className="space-y-2">
              {legends.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-amber-50"
                >
                  <Glyph name="star" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  {l.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
