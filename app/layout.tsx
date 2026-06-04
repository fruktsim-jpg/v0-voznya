import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'ВОЗНЯ — Русскоязычное комьюнити Нидерландов',
  description:
    'Общение, знакомства, концерты, сходки и новые друзья по всей стране.',
  generator: 'v0.app',
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
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
