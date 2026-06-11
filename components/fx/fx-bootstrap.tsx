'use client'

/**
 * FxBootstrap (A2 Sound Layer) — one-time platform sound registration.
 *
 * Mounted once inside FxProvider. Today it registers NOTHING (no audio assets
 * ship yet), so all sound() calls remain safe no-ops while haptics work via
 * Telegram. When assets land, register them here in a single place:
 *
 *   registerPlatformSounds({
 *     rankup: '/sfx/rankup.mp3',
 *     achievement: '/sfx/achievement.mp3',
 *     jackpot: '/sfx/jackpot.mp3',
 *     // …
 *   })
 *
 * Renders nothing.
 */

import { useEffect } from 'react'
// import { registerPlatformSounds } from '@/lib/fx'

export function FxBootstrap() {
  useEffect(() => {
    // No audio assets yet — intentionally empty so sound() no-ops and we never
    // imply audio that does not exist. Flip this on in a future asset stage:
    //
    //   registerPlatformSounds({ rankup: '/sfx/rankup.mp3', ... })
  }, [])

  return null
}
