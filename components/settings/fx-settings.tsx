'use client'

/**
 * FxSettings (Cases Tier 1 — Sound) — the REAL sound + haptics preference UI.
 *
 * Replaces the dead "Скоро" preference slot on /settings with working toggles
 * wired to the shared FX engine (useFx → one localStorage key, governs the whole
 * platform). Sound now produces real audio (procedural Web Audio synth in
 * lib/case-fx.ts), so this toggle is honest: flipping it on makes the open/reveal
 * cues audible immediately. A "проверить" tap plays a sample within the gesture
 * (satisfies autoplay policy). Haptics are the always-available Telegram layer.
 *
 * Honest about platform limits: a hint notes audio depends on the device/browser
 * and that the first sound plays after a tap. No fake state.
 */

import { useFx } from '@/hooks/use-fx'
import { Glyph, type GlyphName } from '@/components/ds/icon'

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        on ? 'border-primary/50 bg-primary/30' : 'border-border bg-white/[0.04]'
      }`}
    >
      <span
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-foreground transition-all ${
          on ? 'left-[calc(100%-1.25rem)]' : 'left-1'
        }`}
      />
    </button>
  )
}

function Row({
  icon,
  title,
  desc,
  children,
}: {
  icon: GlyphName
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-white/[0.02] p-3.5 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-muted-foreground">
        <Glyph name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-[12px] text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  )
}

export function FxSettings() {
  const { fx, prefs, setSound, setHaptics } = useFx()

  return (
    <div className="space-y-2.5">
      <Row icon="volume" title="Звук" desc="Эффекты открытия кейсов и наград">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // Play a sample within the click gesture so the AudioContext
              // resumes under autoplay policy; turn sound on if it was off.
              if (!prefs.sound) setSound(true)
              // Defer one tick so the new pref is applied to the engine.
              setTimeout(() => fx.reveal('epic'), 0)
            }}
            className="rounded-lg border border-border bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            Проверить
          </button>
          <Toggle on={prefs.sound} onChange={setSound} label="Звук" />
        </div>
      </Row>

      <Row icon="bolt" title="Вибрация" desc="Тактильный отклик в Telegram">
        <Toggle
          on={prefs.haptics}
          onChange={(next) => {
            setHaptics(next)
            if (next) setTimeout(() => fx.tap('medium'), 0)
          }}
          label="Вибрация"
        />
      </Row>

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-white/[0.02] px-3.5 py-3 text-[12px] text-muted-foreground">
        <Glyph name="bolt" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Звук зависит от устройства и браузера и впервые проигрывается после нажатия. Вибрация
        работает в приложении Telegram.
      </p>
    </div>
  )
}
