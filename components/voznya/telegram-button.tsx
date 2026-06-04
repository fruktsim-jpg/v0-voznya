import Link from 'next/link'

interface TelegramButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TelegramButton({ variant = 'primary', size = 'md', className = '' }: TelegramButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all hover:scale-105'
  
  const variantClasses = {
    primary: 'bg-[#0088cc] text-white hover:bg-[#006699] shadow-lg shadow-[#0088cc]/30',
    secondary: 'bg-white/10 text-foreground border border-border hover:bg-white/20'
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  return (
    <Link
      href="https://t.me/voznyanlbot"
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
      </svg>
      Открыть в Telegram
    </Link>
  )
}

export function TelegramIconButton({ className = '' }: { className?: string }) {
  return (
    <Link
      href="https://t.me/voznyanlbot"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0088cc] text-white transition-all hover:scale-110 hover:bg-[#006699] ${className}`}
      title="Открыть в Telegram"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
      </svg>
    </Link>
  )
}
