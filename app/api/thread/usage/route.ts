import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const month = new Date().toISOString().slice(0, 7)

    const { data } = await supabase
      .from('thread_usage')
      .select('thread_count, limit_count')
      .eq('user_id', user.id)
      .eq('month', month)
      .maybeSingle()

    const threadCount = data?.thread_count ?? 0
    const limitCount = data?.limit_count ?? 5
    const remaining = Math.max(0, limitCount - threadCount)
    const isLimited = threadCount >= limitCount

    const now = new Date()
    const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    return NextResponse.json({
      success: true,
      month,
      threadCount,
      limitCount,
      remaining,
      isLimited,
      resetsAt,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Thread Usage]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
