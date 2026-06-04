import { NextResponse } from 'next/server'
import { COMMAND_GROUPS } from '@/lib/voznya-bot'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(COMMAND_GROUPS, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
