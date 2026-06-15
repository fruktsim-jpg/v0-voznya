'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Glyph } from '@/components/ds/icon'

/**
 * Root error boundary — replaces Next.js's default unstyled crash screen with
 * an in-world surface. Any uncaught error in a server/client component below the
 * root renders this instead of breaking the premium dark theme.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl border border-white/10 px-6 py-10 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-destructive/15 text-3xl text-destructive-foreground">
          <Glyph name="bolt" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Что-то пошло не так</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Мы уже записали ошибку. Попробуй обновить — обычно помогает.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition active:scale-[0.98] hover:bg-primary/25"
          >
            Обновить
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition active:scale-[0.98] hover:text-foreground"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  )
}
