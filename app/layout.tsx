import type { Metadata, Viewport } from 'next'
import { Inter, Unbounded, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppShell } from '@/components/shell/app-shell'
import { isOidcEnabled } from '@/lib/auth/oidc'
import { loadPublishedAssetOverlay } from '@/lib/item-art/manifest-source'
import { getOverlayVersion } from '@/lib/item-art/manifest'
import { ItemArtHydrator } from '@/components/item-art/item-art-hydrator'
import './globals.css'

// VOZNYA TYPOGRAPHY SYSTEM (PHASE B — B2). Three tonal registers instead of
// "Inter for everything" (the generic-website tell from the A4.5 audit):
//   • Inter        → UI / workhorse: body, labels, dense data (--font-inter)
//   • Unbounded    → DISPLAY / brand voice: screen titles, hero numbers,
//                    prestige/ceremony. Geometric, high-personality, full
//                    Cyrillic. Used sparingly for impact (--font-display)
//   • JetBrains Mono → NUMERIC / mono: balance, MMR, odds, serials, IDs —
//                    numbers read as "stats" (--font-mono-real). Cyrillic-capable.
// All exposed as CSS vars (see globals.css @theme) so surfaces inherit them.
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  weight: ['600', '700', '800', '900'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono-real',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // IA-1: hydrate the dynamic art overlay (published item_assets) so authored
  // art resolves on the first paint, server and client alike. Degrades to the
  // static seed manifest if the table/DB is absent.
  const overlay = await loadPublishedAssetOverlay()
  const overlayVersion = getOverlayVersion()
  return (
    <html lang="ru" className={`${inter.variable} ${unbounded.variable} ${jetbrainsMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <ItemArtHydrator overlay={overlay} version={overlayVersion} />
        <AppShell botId={getPublicBotId()} oidcEnabled={isOidcEnabled()}>
          {children}
        </AppShell>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>

    </html>
  )
}
