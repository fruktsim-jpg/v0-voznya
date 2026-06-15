import Link from 'next/link'
import { Glyph } from '@/components/ds/icon'

/**
 * Styled 404 — replaces Next.js's default not-found page (also used by
 * notFound() in app/profile/[id]). Keeps the user inside the world.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl border border-white/10 px-6 py-10 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-3xl text-primary">
          <Glyph name="search" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Страница не найдена</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Похоже, этой страницы нет или она переехала.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition active:scale-[0.98] hover:bg-primary/25"
        >
          ← На главную
        </Link>
      </div>
    </main>
  )
}
