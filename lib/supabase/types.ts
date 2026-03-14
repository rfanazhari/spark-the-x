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
