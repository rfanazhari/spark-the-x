import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TweetOption } from '../types'

interface TweetCardProps {
  tweet: TweetOption
  pillar: string
  source: 'Claude' | 'OpenAI'
  isPosted: boolean
  onSelect: (tweet: TweetOption) => void
}

function CharCountBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        'text-xs px-2 py-0.5 rounded-full font-mono font-medium',
        count <= 260
          ? 'bg-green-500/15 text-green-400 border border-green-500/30'
          : count <= 280
            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
            : 'bg-red-500/15 text-red-400 border border-red-500/30'
      )}
    >
      {count}
    </span>
  )
}

function PillarBadge({ pillar }: { pillar: string }) {
  const colorMap: Record<string, string> = {
    'Tips & Tutorial': 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    Opini: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    'Behind the Scene': 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    Auto: 'bg-muted/60 text-muted-foreground border border-border',
  }
  const emojiMap: Record<string, string> = {
    'Tips & Tutorial': '💡',
    Opini: '🔥',
    'Behind the Scene': '👀',
    Auto: '✨',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', colorMap[pillar] ?? colorMap['Auto'])}>
      {emojiMap[pillar] ?? '✨'} {pillar}
    </span>
  )
}

export function TweetCard({ tweet, pillar, source, isPosted, onSelect }: TweetCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-border/80 transition-colors">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <PillarBadge pillar={pillar} />
          {isPosted && (
            <span className="w-fit text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/15 text-green-400 border border-green-500/30">
              Sudah Diposting
            </span>
          )}
        </div>
        <div className="sm:ml-auto">
          <CharCountBadge count={tweet.char_count} />
        </div>
      </div>

      <p className="text-sm leading-relaxed text-foreground break-words">{tweet.text}</p>

      <p className="text-xs text-muted-foreground italic leading-relaxed break-words">{tweet.hook}</p>

      {tweet.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tweet.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="default"
        className="w-full mt-auto gap-1.5"
        onClick={() => onSelect(tweet)}
        disabled={isPosted}
        aria-label={`Preview and post tweet from ${source}`}
      >
        <Eye size={14} />
        {isPosted ? 'Sudah Diposting' : 'Preview & Post'}
      </Button>
    </div>
  )
}
