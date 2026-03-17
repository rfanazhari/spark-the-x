import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { HistoryResponse, ReplyHistoryItem } from '@/app/dashboard/reply-hunter/types'
import type { ReplyHistory } from '@/lib/supabase/types'

function parsePage(raw: string | null): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function parseLimit(raw: string | null): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) return 10
  return Math.min(50, Math.floor(parsed))
}

function mapReplyHistoryItem(row: ReplyHistory): ReplyHistoryItem {
  return {
    id: row.id,
    originalTweetId: row.original_tweet_id,
    originalTweetText: row.original_tweet_text,
    originalAuthorHandle: row.original_author_handle,
    replyTweetId: row.reply_tweet_id,
    replyText: row.reply_text,
    toneLabel: row.tone_label,
    impressions: row.impressions,
    engagements: row.engagements,
    createdAt: row.created_at,
    metricsSyncedAt: row.metrics_synced_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parsePage(searchParams.get('page'))
    const limit = parseLimit(searchParams.get('limit'))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = await createClient()
    const { data, count, error } = await supabase
      .from('reply_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const rows = (data ?? []) as ReplyHistory[]
    const response: HistoryResponse = {
      success: true,
      data: rows.map(mapReplyHistoryItem),
      total: count ?? 0,
    }

    console.log(`[ReplyHunterHistory] user=${user.id} page=${page} limit=${limit}`)

    return NextResponse.json(response)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ReplyHunterHistory] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
