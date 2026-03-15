'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Thread, ThreadTweet } from '@/lib/supabase/types'

interface ThreadDetailModalProps {
  threadId: string | null
  onClose: () => void
}

type ThreadDetailResponse =
  | { success: true; thread: Thread; tweets: ThreadTweet[] }
  | { success: false; error?: string }

const THREAD_STATUS_STYLES: Record<Thread['status'], { label: string; className: string }> = {
  posted: { label: 'Posted', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  partial: { label: 'Partial', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  failed: { label: 'Failed', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
}

const MODEL_STYLES: Record<Thread['model'], { label: string; className: string }> = {
  claude: { label: 'Claude', className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  openai: { label: 'GPT-4o', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
}

const TWEET_STATUS_STYLES: Record<ThreadTweet['status'], { label: string; className: string }> = {
  posted: { label: 'Posted', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-300 border-red-500/30' },
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function ThreadDetailModal({ threadId, onClose }: ThreadDetailModalProps) {
  const [detail, setDetail] = useState<{ thread: Thread; tweets: ThreadTweet[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const open = Boolean(threadId)

  useEffect(() => {
    if (!threadId) {
      setDetail(null)
      setError(null)
      setIsLoading(false)
      return
    }
    const controller = new AbortController()

    const loadDetail = async () => {
      setIsLoading(true)
      setError(null)
      setDetail(null)

      try {
        const res = await fetch(`/api/thread/history/${threadId}`, {
          signal: controller.signal,
        })
        const data = (await res.json()) as ThreadDetailResponse

        if ('success' in data && data.success) {
          setDetail({ thread: data.thread, tweets: data.tweets })
        } else {
          setError(data.error ?? 'Failed to load thread details.')
        }
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Network error while loading thread.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadDetail()

    return () => controller.abort()
  }, [threadId, refreshKey])

  const sortedTweets = useMemo(() => {
    if (!detail?.tweets) return []
    return [...detail.tweets].sort((a, b) => a.index - b.index)
  }, [detail])

  const threadStatus = detail ? THREAD_STATUS_STYLES[detail.thread.status] : null
  const modelStyle = detail ? MODEL_STYLES[detail.thread.model] : null
  const totalTweets = detail?.thread.total_tweets ?? sortedTweets.length

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-base font-semibold line-clamp-2">
                {detail?.thread.topic ?? 'Loading thread...'}
              </DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {modelStyle ? (
                  <Badge className={cn('border px-2 py-1 text-[11px]', modelStyle.className)}>
                    {modelStyle.label}
                  </Badge>
                ) : (
                  <Skeleton className="h-5 w-16" />
                )}
                <span>{totalTweets} tweets</span>
                <span>•</span>
                <span>{detail ? formatDate(detail.thread.created_at) : '-'}</span>
              </div>
            </DialogDescription>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-11 w-48" />
                <Skeleton className="h-px w-full" />
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
                <p className="text-red-300">{error}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                >
                  <RefreshCw size={14} className="mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {!isLoading && !error && detail && (
              <div className="space-y-4">
                {threadStatus && (
                  <Badge className={cn('w-full justify-center border px-3 py-2', threadStatus.className)}>
                    {threadStatus.label}
                  </Badge>
                )}

                {detail.thread.first_tweet_url && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={detail.thread.first_tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      View thread on X →
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                )}

                <div className="border-t border-border" />

                <div className="text-sm font-semibold text-foreground">Thread content</div>

                <div className="space-y-3">
                  {sortedTweets.map((tweet, index) => {
                    const typeLabel =
                      tweet.type === 'hook'
                        ? 'Hook'
                        : tweet.type === 'cta'
                          ? 'CTA'
                          : `${index + 1} of ${totalTweets}`
                    const typeClass =
                      tweet.type === 'hook'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : tweet.type === 'cta'
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                    const statusStyle = TWEET_STATUS_STYLES[tweet.status]

                    return (
                      <div
                        key={tweet.id}
                        className="rounded-xl border border-border/70 bg-background/60 p-3"
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <Badge className={cn('border px-2 py-1 text-[11px]', typeClass)}>
                            {typeLabel}
                          </Badge>
                          <p className="flex-1 min-w-0 text-sm text-foreground whitespace-pre-wrap">
                            {tweet.text}
                          </p>
                          <div className="flex items-center gap-2">
                            {tweet.tweet_url && (
                              <a
                                href={tweet.tweet_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Open tweet"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <Badge
                              className={cn(
                                'border px-2 py-1 text-[11px] whitespace-nowrap',
                                statusStyle.className
                              )}
                            >
                              {statusStyle.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card px-4 py-3 sm:px-6">
            <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
