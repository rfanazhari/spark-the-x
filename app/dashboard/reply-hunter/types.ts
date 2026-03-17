export type DiscoveredThread = {
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  authorFollowers: number
  likeCount: number
  replyCount: number
  repostCount: number
  impressionCount: number | null
  engagementScore: number
  createdAt: string
  badge: 'hot' | 'rising' | 'niche' | null
}

export type DiscoverRequest = {
  keywords?: string[]
  language?: 'id' | 'en' | 'all'
  minEngagement?: number
}

export type DiscoverResponse = {
  success: boolean
  data: DiscoveredThread[]
  cached?: boolean
  requestsUsed?: number
  requestsRemaining?: number
  resetsAt?: string
  retryAfter?: number | null
  error?: string
}

export type GenerateReplyRequest = {
  tweetId: string
  tweetText: string
  authorHandle: string
  tone: 'educational' | 'bold' | 'curious'
  model?: 'claude' | 'openai'
}

export type ReplyOption = {
  text: string
  tone: 'educational' | 'bold' | 'curious'
  charCount: number
}

export type GenerateReplyResponse = {
  success: boolean
  data?: ReplyOption[]
  model?: string
  fallbackReason?: string
  error?: string
}

export type PostReplyRequest = {
  originalTweetId: string
  originalTweetText: string
  originalAuthorHandle: string
  replyText: string
  toneLabel: 'educational' | 'bold' | 'curious'
}

export type PostReplyResponse = {
  success: boolean
  replyTweetId?: string
  partialFailure?: boolean
  partialFailureReason?: string
  error?: string
}

export type ReplyHistoryItem = {
  id: string
  originalTweetId: string
  originalTweetText: string | null
  originalAuthorHandle: string | null
  replyTweetId: string
  replyText: string
  toneLabel: string | null
  impressions: number | null
  engagements: number | null
  createdAt: string
  metricsSyncedAt: string | null
}

export type HistoryResponse = {
  success: boolean
  data: ReplyHistoryItem[]
  total: number
  error?: string
}
