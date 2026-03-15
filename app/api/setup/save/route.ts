import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'
import { getTwitterClient } from '@/lib/twitter'

type SavePayload = {
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
  bearerToken: string
  clientId?: string | null
  clientSecret?: string | null
  twitterUsername: string
  twitterUserId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('[Setup Save] Unauthorized: missing user session')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<SavePayload>
    const {
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
      bearerToken,
      clientId,
      clientSecret,
      twitterUsername,
      twitterUserId,
    } = body

    console.log('[Setup Save] Payload received', {
      userId: user.id,
      hasConsumerKey: Boolean(consumerKey?.trim()),
      hasConsumerSecret: Boolean(consumerSecret?.trim()),
      hasAccessToken: Boolean(accessToken?.trim()),
      hasAccessTokenSecret: Boolean(accessTokenSecret?.trim()),
      hasBearerToken: Boolean(bearerToken?.trim()),
      hasClientId: Boolean(clientId?.trim()),
      hasClientSecret: Boolean(clientSecret?.trim()),
      hasTwitterUsername: Boolean(twitterUsername?.trim()),
      hasTwitterUserId: Boolean(twitterUserId?.trim()),
    })

    if (
      !consumerKey?.trim() ||
      !consumerSecret?.trim() ||
      !accessToken?.trim() ||
      !accessTokenSecret?.trim() ||
      !bearerToken?.trim() ||
      !twitterUsername?.trim() ||
      !twitterUserId?.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const normalizedClientId = clientId?.trim() ? encrypt(clientId) : null
    const normalizedClientSecret = clientSecret?.trim() ? encrypt(clientSecret) : null

    const { error } = await supabase
      .from('twitter_accounts')
      .upsert(
        {
          user_id: user.id,
          twitter_username: twitterUsername,
          twitter_user_id: twitterUserId,
          consumer_key: encrypt(consumerKey),
          consumer_secret: encrypt(consumerSecret),
          access_token: encrypt(accessToken),
          access_token_secret: encrypt(accessTokenSecret),
          bearer_token: encrypt(bearerToken),
          client_id: normalizedClientId,
          client_secret: normalizedClientSecret,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error('[Setup Save] Supabase upsert error:', error)
      throw error
    }

    console.log('[Setup Save] Saved credentials', { userId: user.id })

    // Fetch profile data from Twitter API and upsert to profiles table
    try {
      const twitterClient = await getTwitterClient(user.id)
      const profileData = await twitterClient.v2.me({
        'user.fields': ['profile_image_url', 'name'],
      })

      if (profileData.data) {
        const { name, profile_image_url } = profileData.data

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              full_name: name || twitterUsername,
              avatar_url: profile_image_url || null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'id',
            }
          )

        if (profileError) {
          console.warn('[Setup Save] Profile upsert warning:', profileError)
        } else {
          console.log('[Setup Save] Saved profile data', { userId: user.id })
        }
      }
    } catch (profileFetchError: unknown) {
      const msg =
        profileFetchError instanceof Error ? profileFetchError.message : 'Unknown error'
      console.warn('[Setup Save] Failed to fetch profile from Twitter API:', msg)
      // Continue - profile enrichment is optional
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Setup Save] Error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to save credentials'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
