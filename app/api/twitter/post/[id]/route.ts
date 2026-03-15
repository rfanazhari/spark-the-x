import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getTwitterClient } from '@/lib/twitter'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Tweet id is required.' },
        { status: 400 }
      )
    }

    const client = await getTwitterClient(user.id)
    await client.readWrite.v2.deleteTweet(id)

    return NextResponse.json({ success: true, deleted: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[TwitterPost][DELETE] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
