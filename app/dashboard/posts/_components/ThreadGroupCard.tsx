'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type ThreadTweet = {
  index: number
  text: string
  type: 'hook' | 'body' | 'cta'
  tweetId: string | null
  tweetUrl: string | null
  publicMetrics?: {
    retweet_count: number
    like_count: number
    reply_count: number
    impression_count?: number
    quote_count: number
  }
}

type ThreadGroupCardProps = {
  id: string
  topic: string
  model: string
  totalTweets: number
  postedAt: string
  firstTweetUrl: string | null
  tweets: ThreadTweet[]
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

function formatWib(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(d)
  return `${formatted} WIB`
}

function getTweetTypeLabel(type: 'hook' | 'body' | 'cta'): string {
  if (type === 'hook') return 'Hook'
  if (type === 'cta') return 'CTA'
  return 'Body'
}

export function ThreadGroupCard({
  id,
  topic,
  model,
  totalTweets,
  postedAt,
  firstTweetUrl,
  tweets,
}: ThreadGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedTweets, setExpandedTweets] = useState(3)

  const visibleTweets = tweets.slice(0, expandedTweets)
  const hasMore = expandedTweets < tweets.length
  const hookTweet = tweets.find((t) => t.type === 'hook')

  const createdAt = formatWib(postedAt)

  return (
    <div className="rounded-xl border border-border bg-card space-y-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-4 sm:px-5 sm:py-5 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white">Thread</Badge>
            <span className="text-sm font-medium text-foreground truncate">{topic}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{createdAt}</span>
            <Badge variant="outline" className="text-xs">
              {totalTweets} tweets
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {model}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {firstTweetUrl ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation()
                window.open(firstTweetUrl, '_blank', 'noopener,noreferrer')
              }}
              title="View on X"
            >
              <ExternalLink size={16} />
            </Button>
          ) : null}
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Collapsed body preview or expanded content */}
      {isExpanded ? (
        <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5 space-y-3">
          {/* Tweet list */}
          <div className="space-y-3">
            {visibleTweets.map((tweet, idx) => (
              <div key={tweet.index} className="relative">
                {/* Vertical connector line (except for last) */}
                {idx < visibleTweets.length - 1 ? (
                  <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-border/50" />
                ) : null}

                {/* Tweet container */}
                <div className="flex gap-3">
                  {/* Type badge */}
                  <div className="flex-shrink-0 pt-0.5">
                    <Badge variant="outline" className="text-xs font-medium">
                      {getTweetTypeLabel(tweet.type)}
                    </Badge>
                  </div>

                  {/* Tweet content */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {tweet.text}
                    </p>

                    {tweet.publicMetrics ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          ❤️{' '}
                          <span className="text-foreground font-medium tabular-nums">
                            {fmtNumber(tweet.publicMetrics.like_count)}
                          </span>
                        </span>
                        <span>
                          💬{' '}
                          <span className="text-foreground font-medium tabular-nums">
                            {fmtNumber(tweet.publicMetrics.reply_count)}
                          </span>
                        </span>
                        <span>
                          🔁{' '}
                          <span className="text-foreground font-medium tabular-nums">
                            {fmtNumber(tweet.publicMetrics.retweet_count)}
                          </span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show more button */}
          {hasMore ? (
            <button
              onClick={() => setExpandedTweets(tweets.length)}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium pt-2"
            >
              Show {tweets.length - expandedTweets} more tweets →
            </button>
          ) : expandedTweets > 3 ? (
            <button
              onClick={() => setExpandedTweets(3)}
              className="text-sm text-muted-foreground hover:text-foreground font-medium pt-2"
            >
              Show less
            </button>
          ) : null}
        </div>
      ) : hookTweet ? (
        <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words line-clamp-2">
            {hookTweet.text}
          </p>
        </div>
      ) : null}
    </div>
  )
}
