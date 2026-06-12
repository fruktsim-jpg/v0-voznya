import { NextResponse } from 'next/server'
import { getTopReputation } from '@/lib/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const leaders = await getTopReputation(10)
    return NextResponse.json(leaders, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Error fetching reputation top:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reputation' },
      { status: 503 },
    )
  }
}
