import Link from 'next/link'

/**
 * Shown when a Telegram-authenticated user has no row in `users` yet — i.e. they
 * logged in but never played. The site never creates the user; the bot does.
 */
export function NotRegistered() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-20 text-center">
      <div className="mb-5 text-5xl">🎮</div>
      <h1 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
        Ты ещё не зарегистрирован в игре
      </h1>
      <p className="mb-8 text-sm text-muted-foreground sm:text-base">
        Напиши любое сообщение в чате Возня и вернись сюда.
      </p>
      <Link
        href="/"
        className="rounded-full border border-primary/40 bg-primary/10 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
      >
        На главную
      </Link>
    </div>
  )
}
