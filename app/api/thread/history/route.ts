import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Thread } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageParam = Number(searchParams.get('page') ?? '1')
    const limitParam = Number(searchParams.get('limit') ?? '10')

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 10
    const offset = (page - 1) * limit

    const supabase = await createClient()
    const { data, error, count } = await supabase
      .from('threads')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const threads = (data ?? []) as Thread[]
    const total = count ?? 0
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: threads,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ThreadHistory][GET] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
