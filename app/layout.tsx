import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SiteHeader } from '@/components/voznya/site-header'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'cyrillic'] })

const SITE_URL = 'https://voznya.nl'
const DESCRIPTION = 'Общение, знакомства, концерты, сходки и новые друзья по всей стране.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'ВОЗНЯ — Русскоязычное комьюнити Нидерландов',
  description: DESCRIPTION,
  generator: 'v0.app',
  openGraph: {
    title: 'ВОЗНЯ — Русскоязычное комьюнити Нидерландов',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'ВОЗНЯ',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'ВОЗНЯ — Русскоязычное комьюнити Нидерландов',
    description: DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
}

/**
 * Public Telegram bot id used by the branded login button. It's the integer
 * part of the bot token BEFORE ":" — not a secret. Deriving it here (server
 * side) means the branded popup works without requiring an extra public env var.
 * An explicit NEXT_PUBLIC_TELEGRAM_BOT_ID still overrides it client-side.
 */
function getPublicBotId(): string | null {
  const explicit = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID
  if (explicit) return explicit
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  const id = token.split(':', 1)[0]
  return /^\d+$/.test(id) ? id : null
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="bg-background">
      <body className={`${geist.className} font-sans antialiased`}>
        <SiteHeader botId={getPublicBotId()} />

        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
