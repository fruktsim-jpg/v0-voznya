'use client'

import { motion } from 'framer-motion'
import { Glyph, type GlyphName } from '@/components/ds/icon'
import { PlayerLink } from '@/components/ui/player-link'
import type { PersonalDrun } from '@/lib/drun-personal'
import { memoryWhen, type Relationship } from '@/lib/drun-personal-logic'

/**
 * Personal Drun card (Phase B) — "Drun knows who you are".
 *
 * READ-ONLY presentation of what Drun already thinks about a player, rendered on
 * the website + Mini App profile (the same /profile/[id] page serves both). Pure
 * UI over the `PersonalDrun` payload from `lib/drun-personal.ts`; no fetching, no
 * writes. When `data` is null the parent renders nothing, so this component only
 * ever sees content worth showing.
 *
 * Five surfaces, in order of "it knows me" impact:
 *   1. Drun Profile Summary  — summary + speech style + traits/topics.
 *   2. What Drun thinks       — settled opinion: standing + dominant axes.
 *   3. Relationship tags      — spouse/rival/ally/foe/buddy/gifter.
 *   4. Notable memories       — typed social episodes Drun recalls.
 *   5. Personal observations  — self-facts the player told the chat.
 */

const STANDING_TONE: Record<string, string> = {
  ЛЮБИМЧИК: 'text-emerald-200 border-emerald-400/40 bg-emerald-400/10',
  УВАЖАЕМЫЙ: 'text-sky-200 border-sky-400/40 bg-sky-400/10',
  'КЛОУН-ЛЮБИМЕЦ': 'text-amber-200 border-amber-400/40 bg-amber-400/10',
  БЕДОВЫЙ: 'text-orange-200 border-orange-400/40 bg-orange-400/10',
  'НА ЗАМЕТКЕ': 'text-primary border-primary/40 bg-primary/10',
  'СКУЧНЫЙ РАБОТЯГА': 'text-slate-200 border-slate-400/30 bg-white/[0.04]',
  БЕСИТ: 'text-rose-200 border-rose-400/40 bg-rose-400/10',
  'НЕ ВНУШАЕТ ДОВЕРИЯ': 'text-rose-200 border-rose-400/40 bg-rose-400/10',
  ПРИСМАТРИВАЕТСЯ: 'text-muted-foreground border-border bg-white/[0.03]',
}

const AFFINITY_TONE: Record<string, string> = {
  КОРЕШ: 'text-emerald-200 border-emerald-400/40 bg-emerald-400/10',
  ПРИЯТЕЛЬ: 'text-teal-200 border-teal-400/40 bg-teal-400/10',
  НЕЙТРАЛ: 'text-muted-foreground border-border bg-white/[0.03]',
  НЕДРУГ: 'text-orange-200 border-orange-400/40 bg-orange-400/10',
  'ЛИЧНЫЙ ВРАГ': 'text-rose-200 border-rose-400/40 bg-rose-400/10',
}

const REL_GLYPH: Record<Relationship['tone'], GlyphName> = {
  love: 'heart',
  rival: 'swords',
  ally: 'shield',
  foe: 'flame',
  buddy: 'users',
  gift: 'gift',
}

const REL_TONE_CLASS: Record<Relationship['tone'], string> = {
  love: 'border-rose-400/30 bg-rose-400/[0.08] text-rose-100',
  rival: 'border-orange-400/30 bg-orange-400/[0.08] text-orange-100',
  ally: 'border-sky-400/30 bg-sky-400/[0.08] text-sky-100',
  foe: 'border-rose-500/30 bg-rose-500/[0.08] text-rose-100',
  buddy: 'border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100',
  gift: 'border-primary/30 bg-primary/[0.08] text-foreground',
}

function valenceMark(valence: number): { glyph: GlyphName; tone: string } {
  if (valence > 0) return { glyph: 'spark', tone: 'text-emerald-300' }
  if (valence < 0) return { glyph: 'flame', tone: 'text-rose-300' }
  return { glyph: 'bolt', tone: 'text-amber-300' }
}

export function PersonalDrunCard({
  data,
  isOwner = false,
}: {
  data: PersonalDrun | null
  isOwner?: boolean
}) {
  if (!data || !data.hasContent) return null

  const { summary, speechStyle, traits, topics, selfFacts, opinion, affinity, relationships, memories } =
    data

  const whoHeader = isOwner ? 'о тебе' : 'об этом игроке'
  const whoThinks = isOwner ? 'о тебе' : 'о нём'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="mt-3 sm:mt-6"
    >
      <div className="glass relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 sm:rounded-3xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

        {/* Header — frames this as DRUN's view, with an "AI" honesty marker. */}
        <div className="relative mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
            <Glyph name="eye" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="section-title flex items-center gap-2 text-base text-foreground sm:text-lg">
              Тёмный друн {whoHeader}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Что ИИ-персонаж Возни запомнил и думает — со слов чата
            </p>
          </div>
        </div>

        {/* 1) PROFILE SUMMARY — Drun's portrait + how the player writes. */}
        {(summary || speechStyle) && (
          <div className="relative mb-3 space-y-2">
            {summary && (
              <p className="rounded-xl border border-border bg-white/[0.03] px-3.5 py-3 text-sm leading-relaxed text-foreground">
                {summary}
              </p>
            )}
            {speechStyle && (
              <p className="flex items-start gap-2 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-muted-foreground">
                <Glyph name="message" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold text-foreground/80">Манера речи: </span>
                  {speechStyle}
                </span>
              </p>
            )}
          </div>
        )}

        {/* traits + topics — compact chips under the portrait. */}
        {(traits.length > 0 || topics.length > 0) && (
          <div className="relative mb-3 flex flex-wrap gap-1.5">
            {traits.map((t) => (
              <span
                key={`trait-${t}`}
                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.07] px-2.5 py-1 text-[11px] font-medium text-foreground"
              >
                <Glyph name="spark" className="h-3 w-3 text-primary" />
                {t}
              </span>
            ))}
            {topics.map((t) => (
              <span
                key={`topic-${t}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* 2) WHAT DRUN THINKS — settled opinion: standing + dominant axes. */}
        {opinion && (
          <div className="relative mb-3 rounded-xl border border-border bg-white/[0.02] p-3.5">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span className="label-eyebrow">Что друн думает {whoThinks}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                  STANDING_TONE[opinion.standing] ?? STANDING_TONE['НА ЗАМЕТКЕ']
                }`}
              >
                {opinion.standing}
              </span>
            </div>
            {opinion.dominant.length > 0 && (
              <div className="space-y-1.5">
                {opinion.dominant.map((ax) => (
                  <div key={ax.axis} className="flex items-center gap-2.5">
                    <span className="w-24 shrink-0 text-[11px] capitalize text-muted-foreground">
                      {ax.label}
                    </span>
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <span
                        className={`absolute inset-y-0 left-0 rounded-full ${
                          ax.high ? 'bg-emerald-400/70' : 'bg-rose-400/70'
                        }`}
                        style={{ width: `${Math.round(ax.value)}%` }}
                      />
                    </span>
                    <span
                      className={`w-9 shrink-0 text-right text-[11px] font-semibold ${
                        ax.high ? 'text-emerald-200' : 'text-rose-200'
                      }`}
                    >
                      {Math.round(ax.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              Складывалось неделями из поведения в Возне · {opinion.samples} наблюдений
            </p>
          </div>
        )}

        {/* Affinity — personal warmth/hostility toward Drun + recent moments. */}
        {affinity && (
          <div className="relative mb-3 rounded-xl border border-border bg-white/[0.02] p-3.5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="label-eyebrow">Личное отношение к друну</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                  AFFINITY_TONE[affinity.label] ?? AFFINITY_TONE['НЕЙТРАЛ']
                }`}
              >
                {affinity.label}
              </span>
            </div>
            {affinity.episodes.length > 0 && (
              <ul className="space-y-1">
                {affinity.episodes.map((ep, i) => {
                  const mark = valenceMark(ep.tone)
                  return (
                    <li
                      key={`${ep.ts}-${i}`}
                      className="flex items-start gap-2 text-[12px] text-muted-foreground"
                    >
                      <Glyph name={mark.glyph} className={`mt-0.5 h-3 w-3 shrink-0 ${mark.tone}`} />
                      <span className="text-foreground/90">{ep.gist}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* 3) RELATIONSHIP TAGS — who the player is connected to, in Drun's graph. */}
        {relationships.length > 0 && (
          <div className="relative mb-3">
            <span className="label-eyebrow mb-2 block">Связи в Возне</span>
            <div className="flex flex-wrap gap-1.5">
              {relationships.map((r) => (
                <span
                  key={`${r.kind}-${r.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${REL_TONE_CLASS[r.tone]}`}
                >
                  <Glyph name={REL_GLYPH[r.tone]} className="h-3 w-3" />
                  <span className="opacity-70">{r.label}:</span>
                  <PlayerLink userId={r.id} name={r.name} className="font-semibold hover:underline" />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4) NOTABLE MEMORIES — typed social episodes Drun recalls. */}
        {memories.length > 0 && (
          <div className="relative mb-3">
            <span className="label-eyebrow mb-2 block">Что друн помнит</span>
            <ul className="space-y-1.5">
              {memories.map((m) => {
                const mark = valenceMark(m.valence)
                return (
                  <li
                    key={m.id}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-white/[0.02] px-3 py-2"
                  >
                    <Glyph name={mark.glyph} className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${mark.tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground">{m.gist}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="capitalize">{m.label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{memoryWhen(m.ageDays)}</span>
                        {m.significance >= 3 && (
                          <span className="text-amber-300/80">· яркий момент</span>
                        )}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* 5) PERSONAL OBSERVATIONS — self-facts the player told the chat. */}
        {selfFacts.length > 0 && (
          <div className="relative">
            <span className="label-eyebrow mb-2 block">Личные наблюдения</span>
            <ul className="space-y-1">
              {selfFacts.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-[12px] text-muted-foreground"
                >
                  <Glyph name="check" className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}
