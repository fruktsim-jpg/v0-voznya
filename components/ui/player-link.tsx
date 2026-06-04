import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PlayerLinkProps {
  userId: number
  name: string
  className?: string
  children?: React.ReactNode
}

/**
 * Clickable player name that links to their profile.
 * Uses user_id as the primary identifier (stable, doesn't change).
 */
export function PlayerLink({ userId, name, className, children }: PlayerLinkProps) {
  return (
    <Link
      href={`/profile/${userId}`}
      className={cn(
        'hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline',
        className
      )}
    >
      {children || name}
    </Link>
  )
}
