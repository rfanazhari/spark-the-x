import { TwitterApi } from 'twitter-api-v2'
import { Client as XdkClient, OAuth1 } from '@xdevplatform/xdk'
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

export async function getXdkClient(userId: string) {
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

  const oauth1 = new OAuth1({
    apiKey: decrypt(data.consumer_key),
    apiSecret: decrypt(data.consumer_secret),
    callback: process.env.X_OAUTH_CALLBACK_URL ?? 'oob',
    accessToken: decrypt(data.access_token),
    accessTokenSecret: decrypt(data.access_token_secret),
  })

  return new XdkClient({ oauth1 })
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

export async function getTwitterBearerToken(userId: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('twitter_accounts')
    .select('bearer_token')
    .eq('user_id', userId)
    .single()

  if (error || !data?.bearer_token) {
    throw new Error('Bearer token not found')
  }

  return decrypt(data.bearer_token)
}
