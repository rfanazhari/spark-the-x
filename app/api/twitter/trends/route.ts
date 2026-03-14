import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getTwitterClient } from '@/lib/twitter'

export const revalidate = 900 // 15 minutes

const WOEID = {
  worldwide: 1,
  indonesia: 23424846,
} as const

type Location = keyof typeof WOEID

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationParam = searchParams.get('location') ?? 'worldwide'
    const location: Location = locationParam in WOEID ? (locationParam as Location) : 'worldwide'
    const woeid = WOEID[location]

    const client = await getTwitterClient(user.id)
    const trends = await client.readWrite.v1.trendsByPlace(woeid)

    const filtered =
      trends[0]?.trends
        ?.filter((t) => (t.tweet_volume ?? 0) >= 1000)
        ?.sort((a, b) => (b.tweet_volume ?? 0) - (a.tweet_volume ?? 0))
        ?.slice(0, 10)
        ?.map((t) => ({
          name: t.name,
          tweetVolume: t.tweet_volume ?? 0,
          url: t.url,
        })) ?? []

    return NextResponse.json({ success: true, data: filtered, location })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[TwitterTrends][GET] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
