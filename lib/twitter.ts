import { TwitterApi } from 'twitter-api-v2'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function getTwitterClient(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('twitter_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Twitter account not found. Please complete setup.')
  }

  return new TwitterApi({
    appKey: decrypt(data.consumer_key),
    appSecret: decrypt(data.consumer_secret),
    accessToken: decrypt(data.access_token),
    accessSecret: decrypt(data.access_token_secret),
  })
}

export async function getTwitterUsername(userId: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('twitter_accounts')
    .select('twitter_username')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.twitter_username ?? 'me'
}

export async function getTwitterBearerClient(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('twitter_accounts')
    .select('bearer_token')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Twitter account not found. Please complete setup.')
  }

  return new TwitterApi(decrypt(data.bearer_token))
}
