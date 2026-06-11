/**
 * WorldBackdrop (PHASE B — B5: the world layer).
 *
 * VOZNYA must read as a PLACE, not a document on a black page. This is the fixed
 * atmosphere that sits behind every screen: deep gradient depth, two slow
 * drifting nebula blooms (ambient life while idle), a teal accent bloom, plus
 * film grain + vignette for filmic depth. Pure CSS, GPU-cheap (transform/opacity
 * only), z-index -10, non-interactive. All motion stops under
 * prefers-reduced-motion (see globals.css) while the static depth remains.
 *
 * Mounted once in AppShell so it underlies all routes without per-page wiring.
 */
export function WorldBackdrop() {
  return (
    <div className="world-layer" aria-hidden="true">
      <div className="world-orb world-orb--violet" />
      <div className="world-orb world-orb--indigo" />
      <div className="world-orb world-orb--teal" />
      <div className="world-grain" />
      <div className="world-vignette" />
    </div>
  )
}
