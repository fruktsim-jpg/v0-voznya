import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppShell } from '@/components/shell/app-shell'
import { isOidcEnabled } from '@/lib/auth/oidc'
import './globals.css'

// VOZNYA REDESIGN — Inter (latin+cyrillic) matches the Figma visual reference:
// tight, high-contrast UI type. Exposed as the CSS var --font-sans (see
// globals.css @theme) so every surface inherits it without per-component wiring.
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

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
  themeColor: '#070709',
  // iOS Safari: required so env(safe-area-inset-*) resolves to real values
  // (notch / Dynamic Island / home-indicator). Without it every inset is 0
  // and the fixed header collides with the status bar.
  viewportFit: 'cover',
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
    <html lang="ru" className={`${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AppShell botId={getPublicBotId()} oidcEnabled={isOidcEnabled()}>
          {children}
        </AppShell>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>

    </html>
  )
}
