// Case FX architecture (Stage 3 — Opening Experience).
//
// This is the SOUND + HAPTICS layer for the case-opening flow. It is built as a
// thin, dependency-free engine so the experience feels premium WITHOUT shipping
// any audio assets yet (Stage 3 brief: "Do not add actual audio assets. Create
// the architecture and hooks required.").
//
// How it stays asset-free today but ready tomorrow:
//   - Every FX cue is named (CaseSoundCue). A registry maps cue → asset URL.
//   - The registry is EMPTY by default, so playSound() is a safe no-op until a
//     future stage registers real files via registerCaseSounds().
//   - Haptics use the Telegram Mini App HapticFeedback API when available
//     (no asset needed) and silently degrade on desktop / web.
//   - A user setting (sound on/off, haptics on/off) gates everything and is
//     persisted in localStorage — future Settings UI can flip it with no code
//     change here.
//
// SSR-safe: all window/Telegram access is guarded. No `pg`, no fetch.

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

// Default: haptics ON (free, native, expected in TG), sound OFF (no assets yet
// — turning it on would do nothing until files are registered, and we avoid
// implying audio that does not exist).
export const DEFAULT_FX_PREFS: CaseFxPrefs = { sound: false, haptics: true }

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

  /** Play a named cue. No-op unless an asset is registered AND sound is on. */
  sound(cue: CaseSoundCue, volume = 1): void {
    if (!this.prefs.sound) return
    const url = soundRegistry[cue]
    if (!url || typeof window === 'undefined') return
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
    } catch {
      // autoplay blocked / decode error — non-critical.
    }
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
