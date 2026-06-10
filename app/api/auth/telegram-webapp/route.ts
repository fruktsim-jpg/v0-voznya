import { NextResponse, type NextRequest } from 'next/server'
import { verifyWebAppInitData } from '@/lib/auth/telegram'
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type WebAppUser = {
  id?: number
  first_name?: string
  username?: string
}

function debugResponse(error: string, status: number, details: Record<string, unknown> = {}) {
  console.warn('[miniapp-auth]', error, details)
  return NextResponse.json({ error, debug: details }, { status })
}

function parseWebAppUser(raw: URLSearchParams): WebAppUser | null {
  const userJson = raw.get('user')
  if (!userJson) return null
  try {
    return JSON.parse(userJson) as WebAppUser
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken || !process.env.AUTH_SECRET) {
    return debugResponse('auth_unconfigured', 503, {
      hasBotToken: Boolean(botToken),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    })
  }

  let body: { initData?: unknown }
  try {
    body = await request.json()
  } catch {
    return debugResponse('invalid_json', 400)
  }

  const initData = typeof body.initData === 'string' ? body.initData : ''
  if (!initData) {
    return debugResponse('missing_init_data', 400, { initDataType: typeof body.initData })
  }

  const verified = verifyWebAppInitData(initData, botToken)
  if (!verified) {
    const params = new URLSearchParams(initData)
    return debugResponse('invalid_init_data', 401, {
      hasHash: Boolean(params.get('hash')),
      hasAuthDate: Boolean(params.get('auth_date')),
      hasUser: Boolean(params.get('user')),
      authDate: params.get('auth_date'),
      length: initData.length,
    })
  }

  const webAppUser = parseWebAppUser(verified.raw)
  let token = ''
  try {
    token = await createSessionToken({
      uid: verified.userId,
      username: webAppUser?.username ?? null,
      firstName: webAppUser?.first_name ?? null,
    })
  } catch (error) {
    return debugResponse('session_create_failed', 500, {
      message: error instanceof Error ? error.message : 'unknown',
      userId: verified.userId,
    })
  }

  const response = NextResponse.json({ authenticated: true, userId: verified.userId })
  const cookieName = getSessionCookieName()
  const cookieOptions = getSessionCookieOptions()
  response.cookies.set(cookieName, token, cookieOptions)
  response.headers.set(
    'x-miniapp-auth-debug',
    JSON.stringify({ cookieName, secure: cookieOptions.secure, sameSite: cookieOptions.sameSite }),
  )
  console.info('[miniapp-auth] success', {
    userId: verified.userId,
    cookieName,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  })
  return response
}
