import { cookies } from 'next/headers'
import {
  getSessionCookieName,
  verifySessionToken,
  type SessionPayload,
} from './session'

/**
 * Reads and verifies the current session from the request cookies.
 * Safe to call in Server Components and Route Handlers (read-only).
 * Returns null when there is no valid session.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(getSessionCookieName())?.value
  return verifySessionToken(token)
}
