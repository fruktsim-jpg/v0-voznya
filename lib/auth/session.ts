import { SignJWT, jwtVerify } from 'jose'

/**
 * Stateless session layer (JWT in an httpOnly cookie).
 *
 * No DB table is needed — the signed token carries the Telegram user id
 * (== users.user_id). The same layer is reused by the future Mini App route.
 */

export type SessionPayload = {
  uid: number
  username?: string | null
  firstName?: string | null
}

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'voznya_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured')
  }
  return new TextEncoder().encode(secret)
}

export function getSessionCookieName(): string {
  return COOKIE_NAME
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}

export function getClearedCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({
    uid: payload.uid,
    username: payload.username ?? null,
    firstName: payload.firstName ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setSubject(String(payload.uid))
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const uid = Number(payload.uid)
    if (!Number.isInteger(uid) || uid <= 0) return null
    return {
      uid,
      username: (payload.username as string | null) ?? null,
      firstName: (payload.firstName as string | null) ?? null,
    }
  } catch {
    return null
  }
}
