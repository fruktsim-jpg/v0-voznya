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
    return NextResponse.json({ error: 'auth_unconfigured' }, { status: 503 })
  }

  let body: { initData?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const initData = typeof body.initData === 'string' ? body.initData : ''
  const verified = verifyWebAppInitData(initData, botToken)
  if (!verified) {
    return NextResponse.json({ error: 'invalid_init_data' }, { status: 401 })
  }

  const webAppUser = parseWebAppUser(verified.raw)
  const token = await createSessionToken({
    uid: verified.userId,
    username: webAppUser?.username ?? null,
    firstName: webAppUser?.first_name ?? null,
  })

  const response = NextResponse.json({ authenticated: true, userId: verified.userId })
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions())
  return response
}
