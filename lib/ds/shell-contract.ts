/**
 * UNIFIED SHELL CONTRACT (Phase E0.1)
 * ----------------------------------------------------------------------------
 * The single source of truth for the app shell's geometry, shared by the
 * UnifiedShell component and any surface that needs to reason about the bar.
 * The CSS side of the same contract lives in `app/globals.css` (the
 * `--shell-*` custom properties + `.pt-header` / `.pt-hero-safe`). Keep the two
 * in sync: these constants exist so TS/JS never hard-codes a height that the
 * CSS also hard-codes.
 *
 * Why this exists: E0.1 replaced two stacked fixed bars (SiteHeader +
 * PlayerContextBar) and a `has-context-bar` body-class that hand-synced their
 * combined height. Now there is ONE bar with ONE idle height; everything else
 * derives from it.
 */

/** Idle (rest) shell height in rem — matches `--shell-h`. */
export const SHELL_H_REM = 3.5
/** Condensed (scrolled) shell height in rem — matches `--shell-h-min`. */
export const SHELL_H_MIN_REM = 3
/** Scroll distance (px) past which the shell condenses. */
export const SHELL_SCROLL_THRESHOLD = 12
/** The shell's z-index — top of the fixed-chrome stack. */
export const SHELL_Z = 50

/** Tailwind-friendly arbitrary value for the idle shell clearance incl. inset. */
export const SHELL_TOTAL_OFFSET = 'calc(env(safe-area-inset-top)+3.5rem)'
