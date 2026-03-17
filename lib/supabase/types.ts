export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface TwitterAccount {
  id: string
  user_id: string
  twitter_username: string
  twitter_user_id: string | null
  consumer_key: string
  consumer_secret: string
  access_token: string
  access_token_secret: string
  bearer_token: string
  client_id: string | null
  client_secret: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Thread {
  id: string
  user_id: string
  topic: string
  model: 'claude' | 'openai'
  total_tweets: number
  status: 'draft' | 'posted' | 'partial' | 'failed'
  first_tweet_id: string | null
  first_tweet_url: string | null
  created_at: string
  posted_at: string | null
}

export interface ThreadTweet {
  id: string
  thread_id: string
  user_id: string
  index: number
  type: 'hook' | 'body' | 'cta'
  text: string
  char_count: number
  tweet_id: string | null
  tweet_url: string | null
  status: 'pending' | 'posted' | 'failed'
  error: string | null
  posted_at: string | null
  created_at: string
}

export interface ThreadUsage {
  id: string
  user_id: string
  month: string
  thread_count: number
  limit_count: number
  created_at: string
  updated_at: string
}

export interface ReplyHistory {
  id: string
  user_id: string
  original_tweet_id: string
  original_tweet_text: string | null
  original_author_handle: string | null
  reply_tweet_id: string
  reply_text: string
  tone_label: 'educational' | 'bold' | 'curious' | null
  impressions: number | null
  engagements: number | null
  created_at: string
  metrics_synced_at: string | null
}

export interface ReplyHistoryInsert {
  user_id: string
  original_tweet_id: string
  original_tweet_text?: string | null
  original_author_handle?: string | null
  reply_tweet_id: string
  reply_text: string
  tone_label?: 'educational' | 'bold' | 'curious' | null
  impressions?: number | null
  engagements?: number | null
  metrics_synced_at?: string | null
}

export interface ReplyHistoryUpdate {
  original_tweet_text?: string | null
  original_author_handle?: string | null
  reply_text?: string
  tone_label?: 'educational' | 'bold' | 'curious' | null
  impressions?: number | null
  engagements?: number | null
  metrics_synced_at?: string | null
}
