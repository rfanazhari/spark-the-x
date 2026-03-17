import { BarChart3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReplyHistoryItem } from '../types'

interface AnalyticsPanelProps {
  history: ReplyHistoryItem[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`

  return new Date(iso).toLocaleDateString('id-ID')
}

function HistorySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-2">
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  )
}

export function AnalyticsPanel({ history, isLoading, error, onRetry }: AnalyticsPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Reply History</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <HistorySkeleton key={idx} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Mulai reply pertama kamu!</p>
          <p className="text-xs text-muted-foreground mt-1">History reply akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-background p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">@{item.originalAuthorHandle ?? 'unknown'}</p>
              <p className="text-sm text-foreground leading-relaxed line-clamp-2 break-words">"{item.replyText}"</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>👁 {item.impressions ?? '-'}</span>
                <span>❤ {item.engagements ?? '-'}</span>
                <span>{formatRelativeTime(item.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
