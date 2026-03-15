import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getTwitterClient, getTwitterUsername } from '@/lib/twitter'
import { createClient } from '@/lib/supabase/server'

interface ThreadPostBody {
  threadId: string
  tweets: string[]
}

interface ThreadPostResult {
  index: number
  tweetId: string | null
  url: string | null
  status: 'posted' | 'failed'
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId, tweets } = (await request.json()) as ThreadPostBody

    if (!threadId || !tweets?.length) {
      return NextResponse.json(
        { success: false, error: 'threadId and tweets are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: thread } = await supabase
      .from('threads')
      .select('id, status')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!thread) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 })
    }

    const invalid = tweets.filter((t) => t.length > 280)
    if (invalid.length > 0) {
      return NextResponse.json(
        { success: false, error: `${invalid.length} tweet(s) exceed 280 characters` },
        { status: 400 }
      )
    }

    const client = await getTwitterClient(user.id)
    const username = await getTwitterUsername(user.id)

    const results: ThreadPostResult[] = []
    let previousTweetId: string | null = null

    for (let i = 0; i < tweets.length; i++) {
      try {
        const payload: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
          text: tweets[i],
        }
        if (previousTweetId) {
          payload.reply = { in_reply_to_tweet_id: previousTweetId }
        }

        const { data } = await client.readWrite.v2.tweet(payload)
        const url = `https://x.com/${username}/status/${data.id}`

        results.push({ index: i, tweetId: data.id, url, status: 'posted' })
        previousTweetId = data.id

        await supabase
          .from('thread_tweets')
          .update({
            tweet_id: data.id,
            tweet_url: url,
            status: 'posted',
            posted_at: new Date().toISOString(),
          })
          .eq('thread_id', threadId)
          .eq('index', i)

        if (i < tweets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Post failed'
        results.push({ index: i, tweetId: null, url: null, status: 'failed', error: errMsg })

        await supabase
          .from('thread_tweets')
          .update({ status: 'failed', error: errMsg })
          .eq('thread_id', threadId)
          .eq('index', i)
      }
    }

    const postedCount = results.filter((r) => r.status === 'posted').length
    const threadStatus = postedCount === tweets.length
      ? 'posted'
      : postedCount === 0
        ? 'failed'
        : 'partial'

    const firstPosted = results.find((r) => r.status === 'posted')

    await supabase
      .from('threads')
      .update({
        status: threadStatus,
        first_tweet_id: firstPosted?.tweetId ?? null,
        first_tweet_url: firstPosted?.url ?? null,
        posted_at: threadStatus !== 'failed' ? new Date().toISOString() : null,
      })
      .eq('id', threadId)

    console.log(
      `[Thread Post] user=${user.id} threadId=${threadId} status=${threadStatus} posted=${postedCount}/${tweets.length}`
    )

    return NextResponse.json(
      {
        success: threadStatus !== 'failed',
        threadId,
        totalPosted: postedCount,
        status: threadStatus,
        firstTweetUrl: firstPosted?.url ?? null,
        tweets: results,
      },
      { status: threadStatus === 'partial' ? 207 : 200 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Thread Post]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
