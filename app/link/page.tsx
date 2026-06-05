import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * Account-linking confirmation screen.
 *
 * Reached after a first-time Telegram OIDC login whose `sub` is not yet linked
 * to a game account. The OIDC callback created a one-time link request and
 * passed its token here. The user confirms ownership by opening the bot
 * deep-link (`t.me/<bot>?start=link_<token>`) and pressing Start — the bot then
 * resolves the REAL Telegram id and writes the account_links row.
 *
 * No session is issued until the link is confirmed in the bot.
 */
export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

  const deepLink =
    token && botUsername
      ? `https://t.me/${botUsername}?start=link_${encodeURIComponent(token)}`
      : null

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-20 text-center">
      <div className="mb-5 text-5xl">🔗</div>
      <h1 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
        Подтвердите аккаунт в боте
      </h1>
      <p className="mb-8 text-sm text-muted-foreground sm:text-base">
        Вы вошли через Telegram. Остался один шаг: откройте бота и нажмите
        «Start», чтобы привязать вход к вашему игровому профилю. Это нужно
        сделать только один раз.
      </p>

      {deepLink ? (
        <a
          href={deepLink}
          className="rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-primary/20"
        >
          🤖 Открыть бота и подтвердить
        </a>
      ) : (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          Ссылка для привязки недействительна. Попробуйте войти ещё раз.
        </p>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        После подтверждения вернитесь сюда и войдите снова — откроется ваш
        профиль.
      </p>

      <Link
        href="/"
        className="mt-6 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
      >
        На главную
      </Link>
    </div>
  )
}
