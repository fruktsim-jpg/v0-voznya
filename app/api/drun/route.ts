import { NextResponse } from 'next/server'
import { getDrunFeed } from '@/lib/drun-feed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public read-only "Друн говорит" feed (Phase A).
 *
 * GET /api/drun?limit=20&before=<id>&beforeTs=<iso>
 *  - newest first, keyset-paginated by (created_at, id) — pass the last seen
 *    row's id (`before`) and createdAt (`beforeTs`)
 *  - sourced from ai_messages(channel='web', role='assistant') via getDrunFeed
 *  - no auth, no trigger metadata; player-facing only.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? '20')
  const before = searchParams.get('before')
  const beforeTs = searchParams.get('beforeTs')
  const cursor = before && beforeTs ? { id: before, createdAt: beforeTs } : null
  try {
    const items = await getDrunFeed(limit, cursor)
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } },
    )
  } catch {
    // Degrade quietly: an empty page reads as "Drun is quiet", not an error.
    return NextResponse.json({ items: [] })
  }
}
