/**
 * Platform FX (PHASE A — A2 Sound Layer).
 *
 * Promotes the proven case-only FX engine (lib/case-fx.ts) to a PLATFORM-WIDE
 * sound + haptics layer. Same engine, same prefs (one localStorage key, one
 * Settings toggle), now with app-level SEMANTIC cues so any surface can fire a
 * tactile response:
 *
 *   fx.achievement() · fx.rankup() · fx.division() · fx.season()
 *   fx.purchase()    · fx.notify() · fx.uiTap()    · fx.celebrate(rarity)
 *
 * Emotional intent (not "nice sounds"):
 *   - anticipation: the wind-up before a reveal;
 *   - reward:       the sting at the moment of payoff, scaled by significance;
 *   - recognition:  a soft notify when the world acts on YOU.
 *
 * Asset-free by default: the sound registry is EMPTY, so sound() no-ops until a
 * future stage calls registerPlatformSounds({...}) with real files. Haptics work
 * TODAY via Telegram. Nothing here implies audio that does not exist.
 *
 * SSR-safe (delegates to the guarded engine). No data, no fetch.
 */

import {
  CaseFx,
  registerCaseSounds,
  rarityRevealCue,
  type CaseFxPrefs,
  type SoundCue,
} from '@/lib/case-fx'
import type { Rarity } from '@/lib/rarity'

/**
 * PlatformFx — extends CaseFx with semantic, app-level cues. The case-opening
 * flow keeps using CaseFx directly (unchanged); the rest of the platform uses
 * this. Both share the same engine + prefs, so the Settings toggle governs all.
 */
export class PlatformFx extends CaseFx {
  /** Very subtle nav / button tap. Sound (if registered) + light haptic. */
  uiTap(): void {
    this.sound('ui_tap', 0.5)
    this.tap('light')
  }

  /** Achievement unlocked — a satisfying success beat. */
  achievement(): void {
    this.sound('achievement')
    this.notify('success')
    this.tap('medium')
  }

  /** MMR rank up — heavier, "you climbed" weight. */
  rankup(): void {
    this.sound('rankup')
    this.notify('success')
    this.tap('heavy')
  }

  /** New season division reached — the prestige beat (ceremony). */
  division(): void {
    this.sound('division')
    this.notify('success')
    this.tap('heavy')
  }

  /** Season milestone / end. */
  season(): void {
    this.sound('season')
    this.notify('success')
    this.tap('medium')
  }

  /** Purchase / gift sent — confirmation. */
  purchase(): void {
    this.sound('purchase')
    this.notify('success')
    this.tap('medium')
  }

  /** Important notification (soft) — the world acted on you. */
  notification(): void {
    this.sound('notify', 0.7)
    this.notify('warning')
    this.tap('light')
  }

  /**
   * Generic celebration sting used by the A3 Celebration host, scaled by rarity.
   * Mythic/jackpot escalate to the fanfare + heavy buzz.
   */
  celebrate(rarity: Rarity, special = false): void {
    if (special || rarity === 'mythic') {
      this.sound('jackpot')
      this.notify('success')
      this.tap('heavy')
      return
    }
    this.sound(rarityRevealCue(rarity))
    const big = rarity === 'legendary' || rarity === 'epic'
    this.notify(big ? 'success' : 'warning')
    this.tap(big ? 'medium' : 'light')
  }
}

/**
 * Register real audio files for platform cues. Call once at app start (see
 * FxBootstrap) when assets exist. Until then the registry is empty and all
 * sound() calls no-op — zero broken-asset risk.
 *
 * Example (future):
 *   registerPlatformSounds({
 *     rankup: '/sfx/rankup.mp3',
 *     achievement: '/sfx/achievement.mp3',
 *     jackpot: '/sfx/jackpot.mp3',
 *   })
 */
export function registerPlatformSounds(map: Partial<Record<SoundCue, string>>): void {
  registerCaseSounds(map)
}

export type { CaseFxPrefs, SoundCue }
