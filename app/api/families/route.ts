import { NextResponse } from 'next/server'
import { getTopFamilies } from '@/lib/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const families = await getTopFamilies(10)
    return NextResponse.json(families, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Error fetching families:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch families' },
      { status: 503 }
    )
  }
}
