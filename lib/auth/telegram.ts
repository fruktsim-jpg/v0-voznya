import crypto from 'crypto'

/**
 * Telegram authentication helpers.
 *
 * Source of truth for users is the bot. These helpers ONLY verify that the
 * payload genuinely comes from Telegram for our bot — they never read or write
 * the database.
 */

export type TelegramLoginData = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

// Reject payloads older than this — protects against replay of a captured URL.
const MAX_AUTH_AGE_SECONDS = 60 * 60 // 1 hour

function buildDataCheckString(data: Record<string, string>): string {
  return Object.keys(data)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n')
}

function timingSafeEqualHex(a: string, b: string): boolean {
  let ab: Buffer
  let bb: Buffer
  try {
    ab = Buffer.from(a, 'hex')
    bb = Buffer.from(b, 'hex')
  } catch {
    return false
  }
  if (ab.length === 0 || ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function isFreshAuthDate(authDate: number): boolean {
  if (!Number.isFinite(authDate)) return false
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate
  return ageSeconds >= 0 && ageSeconds <= MAX_AUTH_AGE_SECONDS
}

/**
 * Verify a Telegram **Login Widget** payload.
 *
 * Algorithm (per Telegram docs):
 *   secret_key = SHA256(bot_token)
 *   hash       = HMAC_SHA256(data_check_string, secret_key)
 *
 * Returns the verified Telegram user id (== users.user_id) or null.
 */
export function verifyLoginWidget(
  params: Record<string, string>,
  botToken: string,
): { userId: number; data: TelegramLoginData } | null {
  const hash = params.hash
  if (!hash || !botToken) return null

  const authDate = Number(params.auth_date)
  if (!isFreshAuthDate(authDate)) return null

  const dataCheckString = buildDataCheckString(params)
  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (!timingSafeEqualHex(computed, hash)) return null

  const userId = Number(params.id)
  if (!Number.isInteger(userId) || userId <= 0) return null

  return {
    userId,
    data: {
      id: userId,
      first_name: params.first_name,
      last_name: params.last_name,
      username: params.username,
      photo_url: params.photo_url,
      auth_date: authDate,
      hash,
    },
  }
}

/**
 * Verify Telegram **Mini App** `initData` (architecture prep — NOT wired yet).
 *
 * Algorithm (per Telegram WebApp docs):
 *   secret_key = HMAC_SHA256("WebAppData", bot_token)
 *   hash       = HMAC_SHA256(data_check_string, secret_key)
 *
 * When the Mini App stage lands, call this from a new
 * `/api/auth/telegram-webapp` route and reuse the same session layer. Kept here
 * so the verification logic lives in one place and the auth slice does not need
 * to be rewritten later.
 */
export function verifyWebAppInitData(
  initData: string,
  botToken: string,
): { userId: number; raw: URLSearchParams } | null {
  if (!initData || !botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  const authDate = Number(params.get('auth_date'))
  if (!isFreshAuthDate(authDate)) return null

  const pairs: string[] = []
  params.forEach((value, key) => {
    if (key !== 'hash') pairs.push(`${key}=${value}`)
  })
  const dataCheckString = pairs.sort().join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (!timingSafeEqualHex(computed, hash)) return null

  const userJson = params.get('user')
  if (!userJson) return null
  let userId = 0
  try {
    userId = Number(JSON.parse(userJson)?.id)
  } catch {
    return null
  }
  if (!Number.isInteger(userId) || userId <= 0) return null

  return { userId, raw: params }
}
