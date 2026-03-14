import type { MediaObjectV2, TweetV2, TweetV2UserTimelineParams } from 'twitter-api-v2'
import { getTwitterClient } from '@/lib/twitter'
import { getTwitterUserId } from '@/lib/twitter-user'

export type TimelineMedia = Pick<
  MediaObjectV2,
  'media_key' | 'type' | 'url' | 'preview_image_url' | 'width' | 'height'
>

export type TimelineTweet = TweetV2 & { media?: TimelineMedia[] }

export type TimelineMeta = {
  next_token: string | null
  previous_token: string | null
  result_count: number
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

export async function fetchMyPosts(params: {
  userId: string
  paginationToken?: string
}): Promise<{ tweets: TimelineTweet[]; meta: TimelineMeta }> {
  const twitterUserId = await getTwitterUserId(params.userId)

  const timelineParams: TweetV2UserTimelineParams = {
    max_results: 10,
    pagination_token: params.paginationToken,
    expansions: EXPANSIONS,
    'tweet.fields': TWEET_FIELDS,
    'media.fields': MEDIA_FIELDS,
  }

  const client = await getTwitterClient(params.userId)
  const paginator = await client.readWrite.v2.userTimeline(twitterUserId, timelineParams)
  const meta = paginator.meta as { next_token?: string; previous_token?: string; result_count: number }

  const tweets = paginator.tweets.map((t) => {
    const media = paginator.includes.medias(t).map(pickMedia)
    return media.length > 0 ? { ...t, media } : { ...t }
  })

  return {
    tweets,
    meta: {
      next_token: meta.next_token ?? null,
      previous_token: meta.previous_token ?? null,
      result_count: meta.result_count,
    },
  }
}
