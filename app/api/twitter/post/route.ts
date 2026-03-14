import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getTwitterClient, getTwitterUsername } from '@/lib/twitter'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { text } = (await request.json()) as { text: string }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Tweet text is required.' },
        { status: 400 }
      )
    }

    if (text.length > 280) {
      return NextResponse.json(
        { success: false, error: 'Tweet exceeds 280 characters.' },
        { status: 400 }
      )
    }

    const client = await getTwitterClient(user.id)
    const { data } = await client.readWrite.v2.tweet({ text })
    const postedAt = new Date().toISOString()
    const username = await getTwitterUsername(user.id)
    const url = `https://x.com/${username}/status/${data.id}`

    console.log(`[PostPublisher] Tweet posted: ${data.id} at ${postedAt}`)

    return NextResponse.json({
      success: true,
      tweetId: data.id,
      url,
      postedAt,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PostPublisher] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
