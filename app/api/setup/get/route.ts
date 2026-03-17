import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('twitter_accounts')
    .select('bearer_token, consumer_key, consumer_secret, access_token, access_token_secret')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    bearerToken: decrypt(data.bearer_token),
    consumerKey: decrypt(data.consumer_key),
    consumerSecret: decrypt(data.consumer_secret),
    accessToken: decrypt(data.access_token),
    accessTokenSecret: decrypt(data.access_token_secret),
  })
}
