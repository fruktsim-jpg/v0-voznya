import { NextResponse } from 'next/server'
import { getAchievementsProgress } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const data = await getAchievementsProgress()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
