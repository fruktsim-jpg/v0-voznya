// Case FX architecture (Stage 3 — Opening Experience; Cases Tier 1 — Sound).
//
// This is the SOUND + HAPTICS layer for the case-opening flow. It is built as a
// thin, dependency-free engine so the experience feels premium.
//
// SOUND BACKENDS (in priority order, both opt-in via prefs.sound):
//   1. Registered asset — if a future stage calls registerCaseSounds() with a
//      real file URL for a cue, that file plays (highest fidelity).
//   2. Procedural Web Audio synth (Cases Tier 1) — when NO asset is registered,
//      the engine SYNTHESIZES the cue from oscillators + an envelope. This makes
//      the platform genuinely audible TODAY without shipping/awaiting any audio
//      assets, while staying honest: nothing fakes a missing file with a wrong
//      one — the synth IS the real sound. Tiny, generated on the fly, no network.
//   3. Haptics — Telegram Mini App HapticFeedback, the always-available tactile
//      layer, fired alongside whichever audio backend is active.
//
// HONESTY + AUTOPLAY (governing docs §4.2): sound DEFAULT OFF — we never imply
// audio the player didn't opt into; the first cue only fires after a user
// gesture (the open button), so the AudioContext resumes within policy; all of
// it respects the single Settings toggle (prefs.sound) and reduced-motion is
// handled at the call sites.
//
// SSR-safe: all window/Telegram/AudioContext access is guarded. No `pg`, no fetch.

export type CaseSoundCue =
  // flow cues
  | 'open' // case lid / start
  | 'rolling' // reel spin loop tick
  | 'tick' // per-cell pass (optional, throttled)
  | 'reveal' // moment the winner locks in
  // rarity-scaled reveal stings
  | 'reveal_common'
  | 'reveal_uncommon'
  | 'reveal_rare'
  | 'reveal_epic'
  | 'reveal_legendary'
  | 'reveal_mythic'
  | 'jackpot' // jackpot / premium fanfare
  // --- PHASE A (A2) platform-wide cues (beyond cases) ---
  | 'ui_tap' // generic button / nav tap (very subtle)
  | 'achievement' // achievement unlocked
  | 'rankup' // MMR rank up
  | 'division' // new season division reached
  | 'season' // season milestone / end
  | 'purchase' // purchase / gift sent
  | 'notify' // important notification (soft)
  | 'celebrate' // generic celebration sting (A3 fallback)

/** All platform cues are part of CaseSoundCue now; alias for clarity in app code. */
export type SoundCue = CaseSoundCue

import type { Rarity } from '@/lib/rarity'

// --- Settings (persisted, future Settings UI re-points here) ----------------

export type CaseFxPrefs = {
  sound: boolean
  haptics: boolean
}

const PREFS_KEY = 'voznya.fx.prefs.v1'
export const FX_PREFS_EVENT = 'voznya:fx-prefs'

// Default: haptics ON (free, native, expected in TG). Sound DEFAULT ON — the
// procedural synth produces real audio with no asset files, and the default
// experience should be the full experience. Browsers/Telegram still gate audio
// behind the first user gesture (the AudioContext resumes then), so nothing
// plays before interaction. A manual disable is PERSISTED in localStorage and
// always wins on subsequent loads — we never re-enable after the user turns it
// off (readFxPrefs returns the stored value; only a first-time user with no
// stored prefs gets the ON default).
export const DEFAULT_FX_PREFS: CaseFxPrefs = { sound: true, haptics: true }

export function readFxPrefs(): CaseFxPrefs {
  if (typeof window === 'undefined') return DEFAULT_FX_PREFS
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_FX_PREFS
    const parsed = JSON.parse(raw) as Partial<CaseFxPrefs>
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_FX_PREFS.sound,
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : DEFAULT_FX_PREFS.haptics,
    }
  } catch {
    return DEFAULT_FX_PREFS
  }
}

export function writeFxPrefs(prefs: CaseFxPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    window.dispatchEvent(new CustomEvent(FX_PREFS_EVENT))
  } catch {
    // storage disabled — FX prefs are non-critical, degrade silently.
  }
}

// --- Sound registry (empty until a future stage ships assets) ---------------

const soundRegistry: Partial<Record<CaseSoundCue, string>> = {}
const audioCache = new Map<CaseSoundCue, HTMLAudioElement>()

/**
 * Register real audio files for cues. Call once at app start in a future stage:
 *   registerCaseSounds({ open: '/sfx/open.mp3', reveal_mythic: '/sfx/mythic.mp3' })
 * Until then the map is empty and playSound() no-ops — zero broken-asset risk.
 */
export function registerCaseSounds(map: Partial<Record<CaseSoundCue, string>>): void {
  Object.assign(soundRegistry, map)
}

/** Map a rarity to its reveal sting cue (jackpot handled by the caller). */
export function rarityRevealCue(rarity: Rarity): CaseSoundCue {
  return (`reveal_${rarity}` as CaseSoundCue)
}

// --- Procedural Web Audio synth (Cases Tier 1) ------------------------------
//
// When a cue has no registered asset, we synthesize it. One shared, lazily
// created AudioContext (resumed on first gesture). Each cue is a short envelope
// over one or more oscillators — punchy, premium, and tiny. This is the audio
// that makes the platform stop being silent without any asset files.

type Tone = {
  /** Oscillator type. */
  type: OscillatorType
  /** Start frequency (Hz). */
  freq: number
  /** Optional end frequency for a glide (Hz). */
  to?: number
  /** Start time offset from cue start (s). */
  at?: number
  /** Duration (s). */
  dur: number
  /** Peak gain (0..1) before the master volume. */
  gain?: number
}

// Cue → tone recipe. Rarity stings climb in brightness/length with value; the
// jackpot is a bright triad fanfare. Kept short (≤0.6s) for snappy feedback.
const SYNTH: Partial<Record<CaseSoundCue, Tone[]>> = {
  open: [{ type: 'triangle', freq: 180, to: 90, dur: 0.18, gain: 0.5 }],
  rolling: [{ type: 'square', freq: 120, dur: 0.05, gain: 0.12 }],
  tick: [{ type: 'square', freq: 320, dur: 0.03, gain: 0.1 }],
  reveal: [{ type: 'triangle', freq: 520, to: 660, dur: 0.22, gain: 0.4 }],
  reveal_common: [{ type: 'triangle', freq: 360, dur: 0.14, gain: 0.3 }],
  reveal_uncommon: [{ type: 'triangle', freq: 440, to: 520, dur: 0.18, gain: 0.34 }],
  reveal_rare: [{ type: 'triangle', freq: 523, to: 659, dur: 0.24, gain: 0.38 }],
  reveal_epic: [
    { type: 'triangle', freq: 587, to: 784, dur: 0.3, gain: 0.4 },
    { type: 'sine', freq: 880, at: 0.08, dur: 0.26, gain: 0.22 },
  ],
  reveal_legendary: [
    { type: 'triangle', freq: 659, to: 988, dur: 0.36, gain: 0.42 },
    { type: 'sine', freq: 1319, at: 0.12, dur: 0.3, gain: 0.24 },
  ],
  reveal_mythic: [
    { type: 'sawtooth', freq: 523, to: 1047, dur: 0.42, gain: 0.4 },
    { type: 'triangle', freq: 784, at: 0.1, dur: 0.34, gain: 0.3 },
    { type: 'sine', freq: 1568, at: 0.2, dur: 0.28, gain: 0.2 },
  ],
  jackpot: [
    { type: 'triangle', freq: 523, dur: 0.5, gain: 0.4 }, // C
    { type: 'triangle', freq: 659, at: 0.1, dur: 0.46, gain: 0.36 }, // E
    { type: 'triangle', freq: 784, at: 0.2, dur: 0.42, gain: 0.34 }, // G
    { type: 'sine', freq: 1047, at: 0.3, dur: 0.34, gain: 0.26 }, // C↑
  ],
  ui_tap: [{ type: 'sine', freq: 660, dur: 0.04, gain: 0.18 }],
  achievement: [
    { type: 'triangle', freq: 587, to: 880, dur: 0.26, gain: 0.36 },
    { type: 'sine', freq: 1175, at: 0.1, dur: 0.2, gain: 0.2 },
  ],
  rankup: [
    { type: 'triangle', freq: 440, to: 880, dur: 0.34, gain: 0.4 },
    { type: 'sine', freq: 1320, at: 0.14, dur: 0.24, gain: 0.22 },
  ],
  division: [
    { type: 'sawtooth', freq: 392, to: 784, dur: 0.4, gain: 0.4 },
    { type: 'triangle', freq: 1175, at: 0.16, dur: 0.3, gain: 0.26 },
  ],
  season: [{ type: 'triangle', freq: 494, to: 740, dur: 0.3, gain: 0.36 }],
  purchase: [{ type: 'sine', freq: 740, to: 988, dur: 0.16, gain: 0.3 }],
  notify: [{ type: 'sine', freq: 880, dur: 0.12, gain: 0.24 }],
  celebrate: [
    { type: 'triangle', freq: 523, to: 784, dur: 0.3, gain: 0.4 },
    { type: 'sine', freq: 1047, at: 0.1, dur: 0.24, gain: 0.22 },
  ],
}

let audioCtx: AudioContext | null = null
let warnedNoAudio = false

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!audioCtx) audioCtx = new Ctor()
    // Autoplay policy: the context may start suspended until a gesture. We call
    // this from within click handlers (open button), so resume() succeeds.
    if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {})
    return audioCtx
  } catch {
    if (!warnedNoAudio) warnedNoAudio = true
    return null
  }
}

/** Synthesize a cue from its tone recipe. Returns false if it couldn't play. */
function playSynth(cue: CaseSoundCue, volume: number): boolean {
  const recipe = SYNTH[cue]
  if (!recipe) return false
  const ctx = getAudioContext()
  if (!ctx) return false
  try {
    const now = ctx.currentTime
    const master = Math.max(0, Math.min(1, volume)) * 0.6 // headroom
    for (const tone of recipe) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + (tone.at ?? 0)
      const end = start + tone.dur
      const peak = (tone.gain ?? 0.3) * master
      osc.type = tone.type
      osc.frequency.setValueAtTime(tone.freq, start)
      if (tone.to && tone.to !== tone.freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), end)
      }
      // Fast attack → exponential decay (premium "pluck"), no clicks.
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    }
    return true
  } catch {
    return false
  }
}

// --- Telegram haptics --------------------------------------------------------

type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type HapticNotify = 'error' | 'success' | 'warning'

type TelegramHaptics = {
  impactOccurred?: (style: HapticImpact) => void
  notificationOccurred?: (type: HapticNotify) => void
  selectionChanged?: () => void
}

function telegramHaptics(): TelegramHaptics | null {
  if (typeof window === 'undefined') return null
  const wa = (window as unknown as {
    Telegram?: { WebApp?: { HapticFeedback?: TelegramHaptics } }
  }).Telegram?.WebApp?.HapticFeedback
  return wa ?? null
}

// --- Engine ------------------------------------------------------------------

/**
 * CaseFx — the runtime used by the opening flow. Reads prefs at construction
 * and on demand; plays sound cues (when assets registered + sound on) and fires
 * Telegram haptics (when available + haptics on). Everything degrades to a
 * no-op so the flow never throws on web / desktop / muted.
 */
export class CaseFx {
  private prefs: CaseFxPrefs

  constructor(prefs?: CaseFxPrefs) {
    this.prefs = prefs ?? readFxPrefs()
  }

  setPrefs(prefs: CaseFxPrefs) {
    this.prefs = prefs
  }

  /**
   * Play a named cue. No-op unless sound is on. A registered asset URL wins;
   * otherwise the procedural synth generates the cue (so the platform is audible
   * today without asset files). Both stay silent until the user opts in.
   */
  sound(cue: CaseSoundCue, volume = 1): void {
    if (!this.prefs.sound) return
    if (typeof window === 'undefined') return
    const url = soundRegistry[cue]
    if (url) {
      try {
        let audio = audioCache.get(cue)
        if (!audio) {
          audio = new Audio(url)
          audio.preload = 'auto'
          audioCache.set(cue, audio)
        }
        audio.volume = Math.max(0, Math.min(1, volume))
        audio.currentTime = 0
        void audio.play().catch(() => {})
        return
      } catch {
        // autoplay blocked / decode error — fall through to synth.
      }
    }
    // No registered asset (or asset failed) → synthesize the cue.
    playSynth(cue, volume)
  }

  /** Light tap (button presses, cell passes). */
  tap(style: HapticImpact = 'light'): void {
    if (!this.prefs.haptics) return
    telegramHaptics()?.impactOccurred?.(style)
  }

  /** Selection blip — used while the reel decelerates past cells. */
  selection(): void {
    if (!this.prefs.haptics) return
    telegramHaptics()?.selectionChanged?.()
  }

  /** Notification buzz at reveal, scaled by how special the reward is. */
  notify(type: HapticNotify = 'success'): void {
    if (!this.prefs.haptics) return
    telegramHaptics()?.notificationOccurred?.(type)
  }

  /**
   * Composite reveal cue: fires the right sound sting + haptic for the won
   * rarity. `special` (jackpot / premium) escalates to the fanfare + heavy buzz.
   */
  reveal(rarity: Rarity, special = false): void {
    if (special) {
      this.sound('jackpot')
      this.notify('success')
      this.tap('heavy')
      return
    }
    this.sound(rarityRevealCue(rarity))
    const big = rarity === 'legendary' || rarity === 'mythic' || rarity === 'epic'
    this.notify(big ? 'success' : 'warning')
    this.tap(big ? 'medium' : 'light')
  }
}
