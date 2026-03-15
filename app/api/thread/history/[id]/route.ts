import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Thread, ThreadTweet } from '@/lib/supabase/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: threadId } = await params

    const supabase = await createClient()
    const { data: threadData, error: threadError } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (threadError) throw threadError

    if (!threadData) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 })
    }

    const thread = threadData as Thread

    const { data: tweetsData, error: tweetsError } = await supabase
      .from('thread_tweets')
      .select('*')
      .eq('thread_id', thread.id)
      .order('index', { ascending: true })

    if (tweetsError) throw tweetsError

    const tweets = (tweetsData ?? []) as ThreadTweet[]

    return NextResponse.json({
      success: true,
      thread,
      tweets,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ThreadHistory][GET] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
