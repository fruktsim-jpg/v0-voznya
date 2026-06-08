import type { NextRequest } from 'next/server'

/**
 * Resolve the EXTERNAL origin of the site (scheme + host the browser used).
 *
 * Root cause this fixes (Release 2.2 auth revision): behind a reverse proxy
 * (Vercel/nginx/Cloudflare), `request.url` / `request.nextUrl` often carry the
 * INTERNAL origin — typically `http://` and an internal host. Redirecting the
 * post-login browser to that internal `http://` URL means the freshly issued
 * `Secure` session cookie is NOT sent on the next navigation, so the user lands
 * on the profile page "unauthorized" right after a successful login. Building
 * the redirect from the forwarded headers keeps the browser on the real
 * `https://` origin, so the cookie is sent and the session sticks.
 *
 * Precedence:
 *   1. PUBLIC_SITE_URL / NEXT_PUBLIC_SITE_URL (explicit, most reliable);
 *   2. x-forwarded-proto + x-forwarded-host (set by the proxy);
 *   3. host header (assume https in production, else request scheme);
 *   4. request.nextUrl.origin (last resort, may be internal).
 */
export function externalOrigin(request: NextRequest): string {
  const configured =
    process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // fall through to header-based resolution
    }
  }

  const fwdProto = request.headers.get('x-forwarded-proto')
  const fwdHost = request.headers.get('x-forwarded-host')
  const host = fwdHost || request.headers.get('host')

  if (host) {
    const proto =
      (fwdProto && fwdProto.split(',')[0].trim()) ||
      (process.env.NODE_ENV === 'production'
        ? 'https'
        : request.nextUrl.protocol.replace(':', ''))
    return `${proto}://${host}`
  }

  return request.nextUrl.origin
}

/** Build an absolute URL on the external origin for a path (or path+query). */
export function externalUrl(request: NextRequest, path: string): URL {
  return new URL(path, externalOrigin(request))
}
