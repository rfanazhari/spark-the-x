import { NextRequest, NextResponse } from 'next/server'
import type { MediaObjectV2, TweetV2, TweetV2UserTimelineParams } from 'twitter-api-v2'
import { getAuthUser } from '@/lib/auth'
import { getTwitterClient } from '@/lib/twitter'

type TimelineMedia = Pick<
  MediaObjectV2,
  'media_key' | 'type' | 'url' | 'preview_image_url' | 'width' | 'height'
>

type TimelineTweet = TweetV2 & { media?: TimelineMedia[] }

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

    return NextResponse.json({
      success: true,
      data: tweets,
      meta: {
        next_token: timeline.data.meta?.next_token ?? null,
        previous_token: timeline.data.meta?.previous_token ?? null,
        result_count: timeline.data.meta?.result_count ?? 0,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[TwitterPosts][GET] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
