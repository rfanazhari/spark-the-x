import { ArrowUpRight, Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DiscoveredThread } from '../types'

interface ThreadCardProps {
  thread: DiscoveredThread
  onReply: (thread: DiscoveredThread) => void
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function badgeClass(badge: DiscoveredThread['badge']) {
  if (badge === 'hot') return 'border-red-500/30 bg-red-500/10 text-red-400'
  if (badge === 'rising') return 'border-orange-500/30 bg-orange-500/10 text-orange-400'
  if (badge === 'niche') return 'border-blue-500/30 bg-blue-500/10 text-blue-400'
  return ''
}

function badgeLabel(badge: DiscoveredThread['badge']) {
  if (badge === 'hot') return 'HOT'
  if (badge === 'rising') return 'RISING'
  if (badge === 'niche') return 'NICHE'
  return null
}

export function ThreadCard({ thread, onReply }: ThreadCardProps) {
  const badge = badgeLabel(thread.badge)

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {badge ? <Badge className={cn('font-semibold', badgeClass(thread.badge))}>{badge}</Badge> : null}
        <p className="text-xs text-muted-foreground">
          @{thread.authorHandle} · {formatCompactNumber(thread.authorFollowers)} followers
        </p>
      </div>

      <p className="text-sm leading-relaxed text-foreground line-clamp-3 break-words">{thread.text}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Heart size={13} />
          {formatCompactNumber(thread.likeCount)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={13} />
          {formatCompactNumber(thread.replyCount)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Repeat2 size={13} />
          {formatCompactNumber(thread.repostCount)}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full sm:w-auto" onClick={() => onReply(thread)}>
          Reply with AI
        </Button>

        <Button variant="outline" className="w-full sm:w-auto" asChild>
          <a
            href={`https://x.com/i/web/status/${thread.tweetId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on X
            <ArrowUpRight size={14} />
          </a>
        </Button>
      </div>
    </div>
  )
}
