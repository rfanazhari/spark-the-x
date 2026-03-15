import { NextRequest, NextResponse } from 'next/server'
import type { MediaObjectV2, TweetV2, TweetV2UserTimelineParams } from 'twitter-api-v2'
import { getAuthUser } from '@/lib/auth'
import { getTwitterClient } from '@/lib/twitter'
import { createClient } from '@/lib/supabase/server'
import type { Thread, ThreadTweet } from '@/lib/supabase/types'

type TimelineMedia = Pick<
  MediaObjectV2,
  'media_key' | 'type' | 'url' | 'preview_image_url' | 'width' | 'height'
>

type TimelineTweet = TweetV2 & { media?: TimelineMedia[] }

type PublicMetrics = {
  retweet_count: number
  like_count: number
  reply_count: number
  impression_count?: number
  quote_count: number
}

type TimelineThreadTweet = {
  index: number
  text: string
  type: 'hook' | 'body' | 'cta'
  tweetId: string | null
  tweetUrl: string | null
  publicMetrics?: PublicMetrics
}

type TimelineThread = {
  id: string
  topic: string
  model: string
  totalTweets: number
  status: string
  firstTweetUrl: string | null
  postedAt: string | null
  tweets: TimelineThreadTweet[]
}

type TimelinePost = {
  id: string
  text: string
  createdAt?: string
  publicMetrics?: PublicMetrics
  entities?: unknown
  attachments?: unknown
  lang?: string
  possiblySensitive?: boolean
  media?: TimelineMedia[]
}

type TimelineItem =
  | { type: 'post'; postedAt: string; tweet: TimelinePost }
  | { type: 'thread'; postedAt: string; thread: TimelineThread }

type TimelineResponse = {
  success: true
  data: TimelineItem[]
  meta: {
    nextToken: string | null
    previousToken: string | null
    resultCount: number
  }
}

type ErrorResponse = {
  success: false
  error: string
}

const TWEET_FIELDS: TweetV2UserTimelineParams['tweet.fields'] = [
  'id',
  'text',
  'created_at',
  'public_metrics',
  'entities',
  'attachments',
  'lang',
  'possibly_sensitive',
]

const EXPANSIONS: TweetV2UserTimelineParams['expansions'] = [
  'attachments.media_keys',
  'author_id',
]

const MEDIA_FIELDS: TweetV2UserTimelineParams['media.fields'] = [
  'url',
  'preview_image_url',
  'type',
  'width',
  'height',
]

function pickMedia(media: MediaObjectV2): TimelineMedia {
  return {
    media_key: media.media_key,
    type: media.type,
    url: media.url,
    preview_image_url: media.preview_image_url,
    width: media.width,
    height: media.height,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paginationToken = searchParams.get('pagination_token') ?? undefined

    // Fetch tweets from X API
    const client = await getTwitterClient(user.id)
    const me = await client.readWrite.v2.me()

    const timeline = await client.readWrite.v2.userTimeline(me.data.id, {
      max_results: 10,
      'tweet.fields': TWEET_FIELDS,
      expansions: EXPANSIONS,
      'media.fields': MEDIA_FIELDS,
      ...(paginationToken ? { pagination_token: paginationToken } : {}),
    })

    const tweets: TimelineTweet[] = timeline.tweets.map((tweet) => {
      const media = timeline.includes.medias(tweet).map(pickMedia)
      return media.length > 0 ? { ...tweet, media } : { ...tweet }
    })

    // Create a set of tweet IDs for quick lookup
    const tweetIds = new Set(tweets.map((t) => t.id))

    // Fetch threads from Supabase
    const supabase = await createClient()
    const { data: threadsData, error: threadsError } = await supabase
      .from('threads')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['posted', 'partial'])
      .order('posted_at', { ascending: false, nullsFirst: false })

    if (threadsError) throw threadsError

    const threads = (threadsData ?? []) as Thread[]

    // Only fetch thread_tweets if we have threads
    let threadTweets: ThreadTweet[] = []
    if (threads.length > 0) {
      const { data: threadTweetsData, error: threadTweetsError } = await supabase
        .from('thread_tweets')
        .select('*')
        .in(
          'thread_id',
          threads.map((t) => t.id)
        )
        .eq('status', 'posted')
        .order('index', { ascending: true })

      if (threadTweetsError) throw threadTweetsError
      threadTweets = (threadTweetsData ?? []) as ThreadTweet[]
    }

    // Group thread_tweets by thread_id
    const threadTweetsMap = new Map<string, ThreadTweet[]>()
    if (threads.length > 0) {
      threadTweets.forEach((tt) => {
        if (!threadTweetsMap.has(tt.thread_id)) {
          threadTweetsMap.set(tt.thread_id, [])
        }
        threadTweetsMap.get(tt.thread_id)!.push(tt)
      })
    }

    // Build timeline items
    const items: TimelineItem[] = []

    // Add posts from X API
    tweets.forEach((tweet) => {
      const postedAt = tweet.created_at ?? new Date().toISOString()
      items.push({
        type: 'post',
        postedAt,
        tweet: {
          id: tweet.id,
          text: tweet.text,
          createdAt: tweet.created_at,
          publicMetrics: tweet.public_metrics as PublicMetrics | undefined,
          entities: tweet.entities,
          attachments: tweet.attachments,
          lang: tweet.lang,
          possiblySensitive: tweet.possibly_sensitive,
          media: tweet.media,
        },
      })
    })

    // Add threads
    threads.forEach((thread) => {
      const threadTweetsList = threadTweetsMap.get(thread.id) ?? []
      if (threadTweetsList.length === 0) return

      const postedAt = thread.posted_at ?? thread.created_at
      items.push({
        type: 'thread',
        postedAt,
        thread: {
          id: thread.id,
          topic: thread.topic,
          model: thread.model === 'claude' ? 'Claude' : 'GPT-4o',
          totalTweets: thread.total_tweets,
          status: thread.status,
          firstTweetUrl: thread.first_tweet_url,
          postedAt: thread.posted_at,
          tweets: threadTweetsList.map((tt) => ({
            index: tt.index,
            text: tt.text,
            type: tt.type,
            tweetId: tt.tweet_id,
            tweetUrl: tt.tweet_url,
          })),
        },
      })
    })

    // Sort by postedAt descending
    items.sort((a, b) => {
      const aTime = new Date(a.postedAt).getTime()
      const bTime = new Date(b.postedAt).getTime()
      return bTime - aTime
    })

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        nextToken: timeline.data.meta?.next_token ?? null,
        previousToken: timeline.data.meta?.previous_token ?? null,
        resultCount: items.length,
      },
    } as TimelineResponse)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PostsTimeline][GET] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
