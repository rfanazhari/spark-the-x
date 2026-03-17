import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { addAITrace } from '@/lib/ai-trace'
import { getTwitterClient } from '@/lib/twitter'
import type { PostReplyRequest, PostReplyResponse } from '@/app/dashboard/reply-hunter/types'
import type { ReplyHistoryInsert } from '@/lib/supabase/types'

const RATE_LIMIT_PER_HOUR = 10

function extractStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const err = error as Record<string, unknown>
  if (typeof err.code === 'number') return err.code
  if (typeof err.status === 'number') return err.status
  if (typeof err.statusCode === 'number') return err.statusCode
  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as PostReplyRequest
    const replyText = body.replyText?.trim()
    const originalTweetId = body.originalTweetId?.trim()

    if (!replyText) {
      return NextResponse.json(
        { success: false, error: 'Reply text is required.' },
        { status: 400 }
      )
    }

    if (replyText.length > 280) {
      return NextResponse.json(
        { success: false, error: 'Reply exceeds 280 characters.' },
        { status: 400 }
      )
    }

    if (!originalTweetId) {
      return NextResponse.json(
        { success: false, error: 'originalTweetId is required.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: repliesLastHour, error: rateCheckError } = await supabase
      .from('reply_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgoIso)

    if (rateCheckError) {
      return NextResponse.json(
        { success: false, error: 'Failed to check rate limit.' },
        { status: 500 }
      )
    }

    if ((repliesLastHour ?? 0) >= RATE_LIMIT_PER_HOUR) {
      const { data: oldestRecent } = await supabase
        .from('reply_history')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgoIso)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      const resetAt = oldestRecent?.created_at
        ? new Date(new Date(oldestRecent.created_at).getTime() + 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 60 * 60 * 1000).toISOString()

      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit: maksimal 10 reply per jam.',
          resetAt,
        },
        { status: 429 }
      )
    }

    const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: duplicateRow, error: duplicateCheckError } = await supabase
      .from('reply_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('original_tweet_id', originalTweetId)
      .gte('created_at', twentyFourHoursAgoIso)
      .limit(1)
      .maybeSingle()

    if (duplicateCheckError) {
      return NextResponse.json(
        { success: false, error: 'Failed to check duplicate reply window.' },
        { status: 500 }
      )
    }

    if (duplicateRow) {
      return NextResponse.json(
        { success: false, error: 'Kamu sudah reply tweet ini dalam 24 jam terakhir.' },
        { status: 409 }
      )
    }

    const client = await getTwitterClient(user.id)

    let replyTweetId: string
    try {
      const { data } = await client.readWrite.v2.tweet({
        text: replyText,
        reply: { in_reply_to_tweet_id: originalTweetId },
      })
      replyTweetId = data.id
    } catch (postError: unknown) {
      console.error('[ReplyHunterPost] Raw X API error object:', postError)
      const status = extractStatus(postError)
      if (status === 403 || status === 404) {
        const error =
          postError && typeof postError === 'object' ? (postError as Record<string, unknown>) : {}
        console.log('[ReplyHunterPost] 422 error details:', {
          originalTweetId,
          errorCode: error?.code,
          errorMessage: error?.message,
          errorData: JSON.stringify(error?.data ?? error),
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Tweet tidak dapat di-reply. Mungkin sudah dihapus atau akun protected.',
          },
          { status: 422 }
        )
      }
      throw postError
    }

    const insertPayload: ReplyHistoryInsert = {
      user_id: user.id,
      original_tweet_id: originalTweetId,
      original_tweet_text: body.originalTweetText ?? null,
      original_author_handle: body.originalAuthorHandle ?? null,
      reply_tweet_id: replyTweetId,
      reply_text: replyText,
      tone_label: body.toneLabel,
    }

    const { error: insertError } = await supabase.from('reply_history').insert(insertPayload)

    if (insertError) {
      addAITrace({
        provider: 'system',
        operation: 'db_insert_failed',
        ok: false,
        message: insertError.message,
        meta: {
          userId: user.id,
          tweetId: replyTweetId,
          table: 'reply_history',
        },
      })

      const partialResponse: PostReplyResponse = {
        success: true,
        replyTweetId,
        partialFailure: true,
        partialFailureReason: 'Posted but history may not be saved.',
      }

      return NextResponse.json(partialResponse)
    }

    console.log(`[ReplyHunterPost] user=${user.id} replyTweetId=${replyTweetId}`)

    const response: PostReplyResponse = {
      success: true,
      replyTweetId,
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ReplyHunterPost] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
