import Script from 'next/script'
import { MiniAppAuthBootstrap } from '@/components/auth/miniapp-auth-bootstrap'

export const dynamic = 'force-dynamic'

type MiniAppPageProps = {
  searchParams: Promise<{ next?: string; tgWebAppStartParam?: string }>
}

function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

function nextPathFromStartParam(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (value === 'inventory') return '/inventory'
  if (value === 'cases') return '/cases'
  if (value === 'gifts') return '/gifts'
  if (value === 'profile_me') return '/profile/me'

  const profileMatch = value.match(/^profile_(\d+)$/)
  if (profileMatch) return `/profile/${profileMatch[1]}`

  return undefined
}

export default async function MiniAppPage({ searchParams }: MiniAppPageProps) {
  const params = await searchParams
  const nextPath = params.next ?? nextPathFromStartParam(params.tgWebAppStartParam)
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <MiniAppAuthBootstrap nextPath={safeNextPath(nextPath)} />
    </>
  )
}
