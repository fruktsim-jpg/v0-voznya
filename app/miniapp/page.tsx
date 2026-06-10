import Script from 'next/script'
import { MiniAppAuthBootstrap } from '@/components/auth/miniapp-auth-bootstrap'

export const dynamic = 'force-dynamic'

type MiniAppPageProps = {
  searchParams: Promise<{ next?: string }>
}

function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export default async function MiniAppPage({ searchParams }: MiniAppPageProps) {
  const params = await searchParams
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <MiniAppAuthBootstrap nextPath={safeNextPath(params.next)} />
    </>
  )
}
