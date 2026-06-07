import Link from 'next/link'

/**
 * UserBadge — компактное представление игрока (аватар-инициал + ник + опц.
 * титул). Server component. Если задан userId — оборачивается в ссылку на профиль.
 */
export function UserBadge({
  name,
  userId,
  title,
  avatar,
  size = 'md',
  className = '',
}: {
  name: string
  userId?: number
  title?: string | null
  avatar?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dim =
    size === 'lg' ? 'h-12 w-12 text-base' : size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-sm'
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  const inner = (
    <span className={`flex items-center gap-2 ${className}`}>
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary ring-1 ring-primary/30 ${dim}`}
        aria-hidden="true"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        {title && (
          <span className="block truncate text-[11px] text-muted-foreground">{title}</span>
        )}
      </span>
    </span>
  )

  if (userId != null) {
    return (
      <Link href={`/profile/${userId}`} className="transition hover:opacity-80">
        {inner}
      </Link>
    )
  }
  return inner
}
