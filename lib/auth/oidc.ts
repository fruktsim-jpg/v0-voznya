import crypto from 'crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Telegram OpenID Connect (OIDC) verify + flow helpers.
 *
 * Provider metadata (verified live against the discovery document):
 *   issuer                 https://oauth.telegram.org
 *   authorization_endpoint https://oauth.telegram.org/auth
 *   token_endpoint         https://oauth.telegram.org/token
 *   jwks_uri               https://oauth.telegram.org/.well-known/jwks.json
 *   response_types         ["code"]            (Authorization Code only)
 *   grant_types            ["authorization_code"]
 *   PKCE                   S256 supported
 *   auth methods           client_secret_basic / client_secret_post
 *   scopes                 openid, phone, profile, telegram:bot_access
 *   id_token claims        iss, aud, sub, name, preferred_username, picture, iat, exp
 *
 * This layer ONLY verifies the id_token and maps it to a Telegram user id. It
 * never reads or writes the database — the bot remains the single source of
 * truth for users. The classic Login Widget verify (lib/auth/telegram.ts) is
 * kept as a fallback and is unaffected.
 */

export const OIDC_ISSUER =
  process.env.TELEGRAM_OIDC_ISSUER || 'https://oauth.telegram.org'
export const OIDC_AUTH_ENDPOINT =
  process.env.TELEGRAM_OIDC_AUTH_ENDPOINT || `${OIDC_ISSUER}/auth`
export const OIDC_TOKEN_ENDPOINT =
  process.env.TELEGRAM_OIDC_TOKEN_ENDPOINT || `${OIDC_ISSUER}/token`
export const OIDC_JWKS_URI =
  process.env.TELEGRAM_OIDC_JWKS_URI || `${OIDC_ISSUER}/.well-known/jwks.json`

/** Scopes we request. `openid` is mandatory; `profile` gives name/username/picture. */
export const OIDC_SCOPE = process.env.TELEGRAM_OIDC_SCOPE || 'openid profile'

export type OidcConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Returns the OIDC client config when fully configured, else null. Used to
 * decide whether OIDC login is available (otherwise the classic widget is the
 * fallback). client_secret is read server-side only and never exposed.
 */
export function getOidcConfig(): OidcConfig | null {
  const clientId = process.env.TELEGRAM_OIDC_CLIENT_ID
  const clientSecret = process.env.TELEGRAM_OIDC_CLIENT_SECRET
  const redirectUri = process.env.TELEGRAM_OIDC_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function isOidcEnabled(): boolean {
  return getOidcConfig() !== null
}

// --- PKCE / state / nonce ---------------------------------------------------

/** URL-safe random string for state, nonce and the PKCE code_verifier. */
export function randomUrlSafe(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

/** PKCE S256 challenge from a code_verifier. */
export function codeChallengeS256(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

/** Build the authorization URL (Authorization Code + PKCE). */
export function buildAuthorizationUrl(args: {
  config: OidcConfig
  state: string
  nonce: string
  codeChallenge: string
}): string {
  const url = new URL(OIDC_AUTH_ENDPOINT)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', args.config.clientId)
  url.searchParams.set('redirect_uri', args.config.redirectUri)
  url.searchParams.set('scope', OIDC_SCOPE)
  url.searchParams.set('state', args.state)
  url.searchParams.set('nonce', args.nonce)
  url.searchParams.set('code_challenge', args.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

// --- Token exchange + verification -----------------------------------------

// Cache the remote JWKS across invocations (jose handles key rotation/caching).
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(OIDC_JWKS_URI))
  }
  return jwksCache
}

/**
 * Exchange an authorization `code` for tokens at the token endpoint using
 * client_secret_basic auth and the PKCE code_verifier. Returns the raw
 * id_token (a signed JWT).
 */
export async function exchangeCodeForIdToken(args: {
  code: string
  codeVerifier: string
  config: OidcConfig
}): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.config.redirectUri,
    code_verifier: args.codeVerifier,
  })
  const basic = Buffer.from(
    `${args.config.clientId}:${args.config.clientSecret}`,
  ).toString('base64')

  const res = await fetch(OIDC_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`OIDC token endpoint returned ${res.status}`)
  }
  const json = (await res.json()) as { id_token?: unknown }
  if (!json.id_token || typeof json.id_token !== 'string') {
    throw new Error('OIDC token response missing id_token')
  }
  return json.id_token
}

export type OidcClaims = {
  sub: string
  name?: string
  preferredUsername?: string
  picture?: string
}

/**
 * Verify an id_token's signature (via the provider JWKS) and standard claims:
 * issuer, audience (== client_id), and expiry/issued-at (jose enforces these).
 * Also checks the nonce binds the token to this login attempt.
 */
export async function verifyIdToken(
  idToken: string,
  opts: { clientId: string; nonce?: string },
): Promise<OidcClaims> {
  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer: OIDC_ISSUER,
    audience: opts.clientId,
  })
  if (opts.nonce && payload.nonce !== opts.nonce) {
    throw new Error('OIDC nonce mismatch')
  }
  if (!payload.sub) {
    throw new Error('OIDC id_token missing sub')
  }
  return {
    sub: String(payload.sub),
    name: typeof payload.name === 'string' ? payload.name : undefined,
    preferredUsername:
      typeof payload.preferred_username === 'string'
        ? payload.preferred_username
        : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  }
}

/**
 * Map the OIDC `sub` claim to the Telegram user id (== users.user_id).
 *
 * The whole ecosystem keys on the numeric Telegram id, so `sub` must be that
 * number. If Telegram ever returns an opaque/non-numeric sub this returns null
 * and the caller fails the login (the classic widget fallback still works) —
 * we never invent or remap ids, since the bot owns the users table.
 */
export function subToUserId(sub: string): number | null {
  if (!/^\d+$/.test(sub)) return null
  const uid = Number(sub)
  return Number.isInteger(uid) && uid > 0 ? uid : null
}
