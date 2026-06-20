import { NextResponse, type NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { requestAiTest } from '@/lib/bot-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
// The bot's AI-test path can take ~90s (up to two sequential 45s LLM calls).
// Allow the route to run long enough that the bot's own timeout wins instead of
// the platform killing the request first. Kept just above the client's 100s
// abort in lib/bot-client.ts. (Vercel clamps to the plan's max; locally honored.)
export const maxDuration = 110

/**
 * AI test request. Proxies to the bot's internal API, which holds the provider
 * key and the Drun logic. Generates an in-character reply with live context but
 * does NOT post it to chat. Gated on ROLES_MANAGE (owner-only).
 *
 * POST /api/admin/ai/test — { task, subjectId? } → { ok, text } | { ok:false, error }.
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { task?: string; subjectId?: number | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const task = (body.task ?? '').toString().trim()
  if (!task) {
    return NextResponse.json({ error: 'task is required' }, { status: 400 })
  }
  const subjectId =
    body.subjectId !== undefined && body.subjectId !== null
      ? Number(body.subjectId)
      : null

  const result = await requestAiTest(task, subjectId)
  if (result.unreachable) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'bot_unreachable' },
      { status: 503 },
    )
  }
  return NextResponse.json(result)
}
