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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="bg-background">
      <body className={`${geist.className} font-sans antialiased`}>
        <SiteHeader />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
