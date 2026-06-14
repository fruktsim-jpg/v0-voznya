/**
 * WorldBackdrop — the app's base atmosphere.
 *
 * Reset (visual sprint): the drifting nebula orbs + grain + vignette were
 * removed. They were the single biggest "not-native" signal — animated colour
 * blooms behind every screen made the whole product feel like a glowy gaming
 * template instead of a calm Telegram/iOS app. What remains is a single, static,
 * very deep gradient (defined in `.world-layer`) so screens sit on quiet depth,
 * not flat black. Fixed, z -10, non-interactive.
 */
export function WorldBackdrop() {
  return <div className="world-layer" aria-hidden="true" />
}
