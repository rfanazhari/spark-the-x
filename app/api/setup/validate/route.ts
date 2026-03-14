import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'

const USER_FIELDS = ['profile_image_url'] as const

type ValidatePayload = {
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
  bearerToken: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ValidatePayload>
    const {
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
      bearerToken,
    } = body

    if (
      !consumerKey?.trim() ||
      !consumerSecret?.trim() ||
      !accessToken?.trim() ||
      !accessTokenSecret?.trim() ||
      !bearerToken?.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    const client = new TwitterApi({
      appKey: consumerKey,
      appSecret: consumerSecret,
      accessToken,
      accessSecret: accessTokenSecret,
    })

    const { data: me } = await client.readWrite.v2.me({
      'user.fields': [...USER_FIELDS],
    })

    return NextResponse.json({
      success: true,
      username: me.username,
      twitterUserId: me.id,
      profileImageUrl: me.profile_image_url ?? null,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Invalid credentials'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
