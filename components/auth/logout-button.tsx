import { Glyph } from '@/components/ds/icon'

/**
 * Account Center logout control (E0.3). A plain server-rendered form POST to the
 * read-only-safe logout endpoint — no client JS needed. Styled as a full-width
 * destructive-leaning row to match the Player Control Center's "Выйти".
 */
export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] transition-colors group-hover:border-rose-400/40 group-hover:text-rose-300">
          <Glyph name="logout" className="h-4 w-4" />
        </span>
        <span className="flex-1">Выйти из аккаунта</span>
        <Glyph name="chevronUp" className="h-4 w-4 rotate-90 text-muted-foreground/50" />
      </button>
    </form>
  )
}
