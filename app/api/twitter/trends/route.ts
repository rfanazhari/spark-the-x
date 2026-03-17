import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getTwitterBearerToken, getTwitterClient, getXdkClient } from '@/lib/twitter'
import { Client, TrendsClient, type ClientConfig } from '@xdevplatform/xdk'

export const revalidate = 900 // 15 minutes
export const dynamic = 'force-dynamic'

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

    const userClient = await getTwitterClient(user.id)
    const userXdkClient = await getXdkClient(user.id)
    const bearerToken = await getTwitterBearerToken(user.id)
    const appClientConfig: ClientConfig = { bearerToken }
    const appClient = new Client(appClientConfig)
    const trendsClient = new TrendsClient(appClient)
    const personalizedTrendsClient = new TrendsClient(userXdkClient)

    type TrendNormalized = {
      name?: string
      tweet_volume: number | null
      url?: string
    }

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null

    const getString = (value: unknown): string | undefined =>
      typeof value === 'string' ? value : undefined

    const getNumber = (value: unknown): number | undefined =>
      typeof value === 'number' && !Number.isNaN(value) ? value : undefined

    const toNumber = (value: unknown): number | undefined => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? undefined : parsed
      }
      return undefined
    }

    const isForbiddenTierError = (err: unknown) => {
      if (!isRecord(err)) return false
      const statusRaw =
        err.status ??
        err.code ??
        (isRecord(err.data) ? (err.data as Record<string, unknown>).status : undefined)
      const status = toNumber(statusRaw)
      const errorsRaw =
        (isRecord(err.data) ? (err.data as Record<string, unknown>).errors : undefined) ??
        err.errors
      const has453 =
        Array.isArray(errorsRaw) &&
        errorsRaw.some((entry) => {
          if (!isRecord(entry)) return false
          const code = toNumber(entry.code)
          const message = getString(entry.message) ?? ''
          return code === 453 || message.includes('453')
        })
      return status === 403 || status === 453 || has453
    }

    const normalizeTrends = (raw: unknown): TrendNormalized[] => {
      if (!raw) return []
      let trends: unknown[] = []
      if (Array.isArray(raw)) {
        const first = raw[0]
        if (isRecord(first) && Array.isArray(first.trends)) {
          trends = first.trends
        } else {
          trends = raw
        }
      } else if (isRecord(raw) && Array.isArray(raw.data)) {
        trends = raw.data
      } else if (isRecord(raw) && isRecord(raw.data) && Array.isArray(raw.data.trends)) {
        trends = raw.data.trends
      } else if (isRecord(raw) && Array.isArray(raw.trends)) {
        trends = raw.trends
      }

      return trends.map((entry) => {
        const t = isRecord(entry) ? entry : {}
        const name = getString(t.trendName) ?? getString(t.trend_name) ?? getString(t.name)
        const tweetVolume =
          getNumber(t.tweetCount) ??
          getNumber(t.tweet_count) ??
          getNumber(t.tweet_volume) ??
          null
        const url =
          getString(t.url) ??
          `https://x.com/search?q=${encodeURIComponent(name ?? '')}`
        return { name, tweet_volume: tweetVolume, url }
      })
    }

    let rawTrends: TrendNormalized[] = []
    let byWoeidError: unknown | null = null
    let personalizedError: unknown | null = null
    let unexpectedWoeidError: unknown | null = null
    try {
      const woeidResponse = await trendsClient.getByWoeid(woeid)
      rawTrends = normalizeTrends(woeidResponse)
    } catch (err) {
      if (isForbiddenTierError(err)) {
        byWoeidError = err
      } else {
        unexpectedWoeidError = err
      }
    }
    if (unexpectedWoeidError) {
      throw unexpectedWoeidError
    }

    if (byWoeidError) {
      console.log('[TwitterTrends][GET] Trends by WOEID blocked:', byWoeidError)
      let unexpectedPersonalizedError: unknown | null = null
      try {
        rawTrends = normalizeTrends(await personalizedTrendsClient.getPersonalized())
      } catch (err) {
        if (isForbiddenTierError(err)) {
          personalizedError = err
        } else {
          unexpectedPersonalizedError = err
        }
      }
      if (unexpectedPersonalizedError) {
        throw unexpectedPersonalizedError
      }
    }

    if (personalizedError) {
      console.log('[TwitterTrends][GET] Personalized trends blocked:', personalizedError)
      // Basic tier limitation: personalized trends may still be blocked (403/453),
      // so we approximate trends from recent hashtag usage.
      const query = '#trending OR #viral OR #berita'
      const search = await userClient.v2.search(query, {
        max_results: 100,
        'tweet.fields': ['entities'],
      })
      const hashtagCounts = new Map<string, number>()

      for (const tweet of search.tweets ?? []) {
        const hashtags = tweet.entities?.hashtags ?? []
        for (const tag of hashtags) {
          const name = tag?.tag ? `#${tag.tag}` : ''
          if (!name) continue
          hashtagCounts.set(name, (hashtagCounts.get(name) ?? 0) + 1)
        }
      }

      rawTrends = Array.from(hashtagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({
          name,
          tweet_volume: count,
          url: `https://x.com/search?q=${encodeURIComponent(name)}`,
        }))
    }

    const filtered =
      rawTrends
        ?.sort(
          (a, b) =>
            (b.tweet_volume ?? 0) - (a.tweet_volume ?? 0)
        )
        ?.slice(0, 10)
        ?.map((t) => ({
          name: t.name,
          tweetVolume: t.tweet_volume ?? null,
          url: t.url ?? `https://x.com/search?q=${encodeURIComponent(t.name ?? '')}`,
        })) ?? []

    return NextResponse.json({ success: true, data: filtered, location })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[TwitterTrends][GET] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
