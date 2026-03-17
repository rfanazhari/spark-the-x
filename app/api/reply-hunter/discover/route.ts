import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getTwitterBearerClient } from '@/lib/twitter'
import type { DiscoveredThread, DiscoverResponse } from '@/app/dashboard/reply-hunter/types'
import type { TweetV2, UserV2 } from 'twitter-api-v2'

const DEFAULT_KEYWORDS = ['AI', 'programming', 'tech', 'Indonesia']
const DEFAULT_SEARCH_QUERY =
  '(AI OR programming OR startup OR teknologi) (Indonesia OR Indonesian) -is:retweet (lang:id OR lang:en)'
const MIN_AUTHOR_FOLLOWERS = 100
const LOW_ENGAGEMENT_AUTHOR_FOLLOWERS = 500
const DISCOVER_CACHE_TTL_MS = 15 * 60 * 1000
const DAILY_DISCOVER_LIMIT = 5

type DiscoverCacheEntry = {
  data: DiscoveredThread[]
  expiresAt: number
}

type DailyUsageEntry = {
  dateKey: string
  count: number
}

const discoverCache = new Map<string, DiscoverCacheEntry>()
const dailyUsageByUser = new Map<string, DailyUsageEntry>()

type Language = 'id' | 'en' | 'all'

function parseKeywords(raw: string | null): string[] {
  if (!raw) return DEFAULT_KEYWORDS

  const parsed = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : DEFAULT_KEYWORDS
}

function parseLanguage(raw: string | null): Language {
  if (raw === 'id' || raw === 'en' || raw === 'all') return raw
  return 'all'
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasKeywordMatch(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((keyword) => {
    const trimmed = keyword.trim()
    if (!trimmed) return false
    const regex = new RegExp(`\\b${escapeRegex(trimmed.toLowerCase())}\\b`, 'i')
    return regex.test(lower)
  })
}

function extractRetryAfterSeconds(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const err = error as Record<string, unknown>

  if (typeof err.rateLimit === 'object' && err.rateLimit !== null) {
    const rateLimit = err.rateLimit as Record<string, unknown>
    if (typeof rateLimit.reset === 'number') {
      const seconds = Math.max(0, Math.round(rateLimit.reset - Date.now() / 1000))
      return seconds
    }
  }

  const headers = err.headers as Record<string, unknown> | undefined
  const resetRaw = headers?.['x-rate-limit-reset']
  if (typeof resetRaw === 'string') {
    const resetEpoch = Number(resetRaw)
    if (!Number.isNaN(resetEpoch)) {
      return Math.max(0, Math.round(resetEpoch - Date.now() / 1000))
    }
  }

  return null
}

function extractStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const err = error as Record<string, unknown>
  if (typeof err.code === 'number') return err.code
  if (typeof err.status === 'number') return err.status
  if (typeof err.statusCode === 'number') return err.statusCode
  return null
}

function getDateKey(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getResetsAt(now = new Date()): string {
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)
  return nextMidnight.toISOString()
}

function getOrInitDailyUsage(userId: string): DailyUsageEntry {
  const todayKey = getDateKey()
  const existing = dailyUsageByUser.get(userId)

  if (!existing || existing.dateKey !== todayKey) {
    const fresh: DailyUsageEntry = { dateKey: todayKey, count: 0 }
    dailyUsageByUser.set(userId, fresh)
    return fresh
  }

  return existing
}

function getUsageStats(userId: string): { requestsUsed: number; requestsRemaining: number } {
  const usage = getOrInitDailyUsage(userId)
  return {
    requestsUsed: usage.count,
    requestsRemaining: Math.max(0, DAILY_DISCOVER_LIMIT - usage.count),
  }
}

function incrementUsage(userId: string): { requestsUsed: number; requestsRemaining: number } {
  const usage = getOrInitDailyUsage(userId)
  usage.count += 1
  dailyUsageByUser.set(userId, usage)
  return {
    requestsUsed: usage.count,
    requestsRemaining: Math.max(0, DAILY_DISCOVER_LIMIT - usage.count),
  }
}

function getCacheKey(userId: string, keywords: string[]): string {
  const normalizedKeywords = keywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .join('|')
  return `${userId}:${normalizedKeywords}`
}

export async function GET(request: NextRequest) {
  let userId: string | null = null
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: 'Unauthorized',
          requestsUsed: 0,
          requestsRemaining: 0,
        } satisfies DiscoverResponse,
        { status: 401 }
      )
    }
    userId = user.id

    const { searchParams } = new URL(request.url)
    const rawKeywords = searchParams.get('keywords')
    const keywords = parseKeywords(rawKeywords)
    const language = parseLanguage(searchParams.get('language'))
    const cacheKey = getCacheKey(user.id, keywords)

    const queryParts: string[] = [`(${keywords.join(' OR ')})`, '-is:retweet']
    if (language === 'id' || language === 'en') {
      queryParts.push(`lang:${language}`)
    }

    const hasCustomKeywords = Boolean(rawKeywords?.trim())
    const query = hasCustomKeywords ? queryParts.join(' ') : DEFAULT_SEARCH_QUERY

    const cachedEntry = discoverCache.get(cacheKey)
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      const usage = getUsageStats(user.id)
      return NextResponse.json({
        success: true,
        data: cachedEntry.data,
        cached: true,
        requestsUsed: usage.requestsUsed,
        requestsRemaining: usage.requestsRemaining,
      } satisfies DiscoverResponse)
    }
    if (cachedEntry) {
      discoverCache.delete(cacheKey)
    }

    const usageBeforeCall = getUsageStats(user.id)
    if (usageBeforeCall.requestsUsed >= DAILY_DISCOVER_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: 'Daily limit reached (5/day). Resets at midnight.',
          resetsAt: getResetsAt(),
          requestsUsed: usageBeforeCall.requestsUsed,
          requestsRemaining: usageBeforeCall.requestsRemaining,
        } satisfies DiscoverResponse,
        { status: 429 }
      )
    }
    const usage = incrementUsage(user.id)

    const client = await getTwitterBearerClient(user.id)
    const search = await client.v2.search(query, {
      max_results: 100,
      sort_order: 'relevancy',
      'tweet.fields': ['public_metrics', 'created_at', 'author_id', 'text', 'referenced_tweets'],
      'user.fields': ['public_metrics', 'username', 'name', 'profile_image_url'],
      expansions: ['author_id'],
    })

    const usersById = new Map<string, UserV2>()
    for (const userItem of search.includes?.users ?? []) {
      usersById.set(userItem.id, userItem)
    }

    const tweets = (search.tweets ?? []) as TweetV2[]
    console.log('Total tweets before filter:', tweets.length)
    for (const tweet of search.tweets ?? []) {
      const author = usersById.get(tweet.author_id ?? '')
      const metrics = tweet.public_metrics
      const retweetCount = metrics?.retweet_count ?? 'N/A'
      console.log('Tweet debug:', {
        id: tweet.id,
        authorFollowers: author?.public_metrics?.followers_count ?? 'N/A',
        likeCount: metrics?.like_count ?? 'N/A',
        replyCount: metrics?.reply_count ?? 'N/A',
        repostCount: retweetCount,
        engagementScore:
          (metrics?.like_count ?? 0) + (metrics?.reply_count ?? 0) + (metrics?.retweet_count ?? 0),
        isRetweet: tweet.text?.startsWith('RT @'),
      })
    }

    const dedup = new Map<string, DiscoveredThread>()
    for (const tweet of tweets) {
      if (!tweet.id || !tweet.text || !tweet.author_id || !tweet.created_at) continue
      if (tweet.text.startsWith('RT @')) continue

      const author = usersById.get(tweet.author_id)
      if (!author?.username) continue

      const authorFollowers = author.public_metrics?.followers_count ?? 0
      if (authorFollowers < MIN_AUTHOR_FOLLOWERS) continue

      const metrics = tweet.public_metrics
      const likeCount = metrics?.like_count ?? 0
      const replyCount = metrics?.reply_count ?? 0
      const repostCount = metrics?.retweet_count ?? 0
      const impressionCount = null
      const engagementScore = likeCount + replyCount + repostCount

      if (engagementScore < 1 && authorFollowers < LOW_ENGAGEMENT_AUTHOR_FOLLOWERS) continue

      const createdMs = new Date(tweet.created_at).getTime()
      if (Number.isNaN(createdMs)) continue
      const ageMs = Date.now() - createdMs
      const nicheMatch = hasKeywordMatch(tweet.text, keywords)

      let badge: DiscoveredThread['badge'] = null
      if (engagementScore > 500) {
        badge = 'hot'
      } else if (engagementScore > 100 && ageMs < 6 * 60 * 60 * 1000) {
        badge = 'rising'
      } else if (nicheMatch) {
        badge = 'niche'
      }

      dedup.set(tweet.id, {
        tweetId: tweet.id,
        text: tweet.text,
        authorHandle: author.username,
        authorName: author.name ?? author.username,
        authorFollowers,
        likeCount,
        replyCount,
        repostCount,
        impressionCount,
        engagementScore,
        createdAt: tweet.created_at,
        badge,
      })
    }

    const filteredResults = Array.from(dedup.values()).sort(
      (a, b) => b.engagementScore - a.engagementScore
    )
    console.log('Total tweets after filter:', filteredResults.length)
    const results = filteredResults.slice(0, 20)
    discoverCache.set(cacheKey, {
      data: results,
      expiresAt: Date.now() + DISCOVER_CACHE_TTL_MS,
    })

    const response: DiscoverResponse = {
      success: true,
      data: results,
      cached: false,
      requestsUsed: usage.requestsUsed,
      requestsRemaining: usage.requestsRemaining,
    }

    console.log(
      `[ReplyHunterDiscover] user=${user.id} keywords=${keywords.join('|')} results=${results.length}`
    )

    return NextResponse.json(response)
  } catch (error: unknown) {
    const status = extractStatus(error)
    if (status === 429) {
      const usage =
        userId !== null ? getUsageStats(userId) : { requestsUsed: 0, requestsRemaining: 0 }
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: 'X API rate limit. Coba lagi dalam beberapa menit.',
          retryAfter: extractRetryAfterSeconds(error),
          requestsUsed: usage.requestsUsed,
          requestsRemaining: usage.requestsRemaining,
        },
        { status: 429 }
      )
    }

    const usage =
      userId !== null ? getUsageStats(userId) : { requestsUsed: 0, requestsRemaining: 0 }
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ReplyHunterDiscover] Error:', error)
    return NextResponse.json(
      {
        success: false,
        data: [],
        error: msg,
        requestsUsed: usage.requestsUsed,
        requestsRemaining: usage.requestsRemaining,
      },
      { status: 500 }
    )
  }
}
