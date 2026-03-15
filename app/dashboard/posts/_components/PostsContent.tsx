'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ExternalLink,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ThreadGroupCard } from './ThreadGroupCard'

type TimelineMedia = {
  media_key: string
  type: string
  url?: string
  preview_image_url?: string
  width?: number
  height?: number
}

type PublicMetrics = {
  retweet_count: number
  like_count: number
  reply_count: number
  impression_count?: number
  quote_count: number
}

type TimelineTweet = {
  id: string
  text: string
  createdAt?: string
  publicMetrics?: PublicMetrics
  entities?: unknown
  attachments?: unknown
  lang?: string
  possiblySensitive?: boolean
  media?: TimelineMedia[]
}

type TimelineThreadTweet = {
  index: number
  text: string
  type: 'hook' | 'body' | 'cta'
  tweetId: string | null
  tweetUrl: string | null
  publicMetrics?: PublicMetrics
}

type TimelineThread = {
  id: string
  topic: string
  model: string
  totalTweets: number
  status: string
  firstTweetUrl: string | null
  postedAt: string | null
  tweets: TimelineThreadTweet[]
}

type TimelineItem =
  | { type: 'post'; postedAt: string; tweet: TimelineTweet }
  | { type: 'thread'; postedAt: string; thread: TimelineThread }

type TimelineResponse = {
  success: true
  data: TimelineItem[]
  meta: {
    nextToken: string | null
    previousToken: string | null
    resultCount: number
  }
}

type ErrorResponse = {
  success: false
  error: string
}

type ProfileResponse = {
  success: true
  data: {
    public_metrics?: {
      tweet_count: number
    }
  }
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

function fmtNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

function PostsSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      {Array.from({ length: 10 }).map((_, i) => {
        // Alternate between post and thread skeletons
        const isThread = i % 3 === 0
        return (
          <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
            {isThread ? (
              <>
                {/* Thread skeleton */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-9 rounded" />
                </div>
              </>
            ) : (
              <>
                {/* Post skeleton */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-10/12" />
                  </div>
                  <Skeleton className="h-16 w-16 rounded-lg" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-28 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function getThumbUrl(media?: TimelineMedia[]): string | null {
  const first = media?.[0]
  if (!first) return null
  return first.url ?? first.preview_image_url ?? null
}

export function PostsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = useMemo(() => {
    const raw = searchParams.get('page')
    const n = raw ? Number(raw) : 1
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
  }, [searchParams])

  const paginationToken = searchParams.get('pagination_token') ?? undefined

  const [items, setItems] = useState<TimelineItem[]>([])
  const [meta, setMeta] = useState<TimelineResponse['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [confirmTweetId, setConfirmTweetId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [storedPrevToken, setStoredPrevToken] = useState<string | null>(null)

  useEffect(() => {
    if (page <= 2) {
      setStoredPrevToken(null)
      return
    }
    try {
      setStoredPrevToken(sessionStorage.getItem(`posts:page:${page - 1}`) ?? null)
    } catch {
      setStoredPrevToken(null)
    }
  }, [page])

  const canPrev = page > 1 && (page === 2 || Boolean(meta?.previousToken) || Boolean(storedPrevToken))
  const canNext = Boolean(meta?.nextToken)

  const fetchProfileCount = useCallback(async () => {
    try {
      const res = await fetch('/api/twitter/profile')
      const json = (await res.json()) as ProfileResponse | ErrorResponse
      if (json.success) {
        const count = json.data.public_metrics?.tweet_count
        if (typeof count === 'number') setTotalCount(count)
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (paginationToken) qs.set('pagination_token', paginationToken)
      const res = await fetch(`/api/posts/timeline?${qs.toString()}`)
      const json = (await res.json()) as TimelineResponse | ErrorResponse
      if (json.success) {
        setItems(json.data)
        setMeta(json.meta)
        try {
          if (paginationToken) sessionStorage.setItem(`posts:page:${page}`, paginationToken)
          if (json.meta.nextToken) {
            sessionStorage.setItem(`posts:page:${page + 1}`, json.meta.nextToken)
          }
        } catch {
          // ignore storage errors
        }
      } else {
        setItems([])
        setMeta(null)
        setError(json.error ?? 'Failed to fetch posts.')
      }
    } catch {
      setItems([])
      setMeta(null)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [paginationToken, page])

  useEffect(() => {
    fetchProfileCount()
  }, [fetchProfileCount])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  function goToPage(nextPage: number, token?: string | null) {
    const qs = new URLSearchParams()
    qs.set('page', String(nextPage))
    if (token) qs.set('pagination_token', token)
    router.push(`/dashboard/posts?${qs.toString()}`)
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/twitter/post/${id}`, { method: 'DELETE' })
      const json = (await res.json()) as { success: true; deleted: boolean } | ErrorResponse
      if (!json.success) {
        setError(json.error ?? 'Failed to delete tweet.')
        return
      }
      setConfirmTweetId(null)
      await fetchPosts()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="app-container py-6 md:py-8">
      <div className="max-w-5xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {totalCount === null ? '—' : `${fmtNumber(totalCount)} posts`}
          </Badge>
          <span className="text-xs text-muted-foreground">Total posts</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive mt-6">
          {error}
        </div>
      ) : null}

      {loading ? (
        <PostsSkeletonGrid />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center mt-6">
          <ImageIcon size={34} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            Belum ada postingan. Yuk buat tweet pertamamu!
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/post">Buat Post</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {items.map((item) => {
            if (item.type === 'thread') {
              return (
                <ThreadGroupCard
                  key={item.thread.id}
                  id={item.thread.id}
                  topic={item.thread.topic}
                  model={item.thread.model}
                  totalTweets={item.thread.totalTweets}
                  postedAt={item.thread.postedAt || item.postedAt}
                  firstTweetUrl={item.thread.firstTweetUrl}
                  tweets={item.thread.tweets}
                />
              )
            }

            // Render post
            const tweet = item.tweet
            const thumb = getThumbUrl(tweet.media)
            const lang = tweet.lang?.toUpperCase() ?? '—'
            const metrics = tweet.publicMetrics
            const createdAt = tweet.createdAt ? formatWib(tweet.createdAt) : '—'
            const viewUrl = `https://x.com/rfanazhari/status/${tweet.id}`

            return (
              <div
                key={tweet.id}
                className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Post</Badge>
                      <span className="text-xs text-muted-foreground">{createdAt}</span>
                      <Badge className="uppercase" variant="outline">
                        {lang}
                      </Badge>
                      {tweet.possiblySensitive ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle size={12} />
                          Sensitive
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {tweet.text}
                    </p>
                  </div>

                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt="Tweet media"
                      className="h-16 w-16 rounded-lg object-cover border border-border bg-muted"
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span>
                    🔁 Retweets{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {metrics ? fmtNumber(metrics.retweet_count) : '—'}
                    </span>
                  </span>
                  <span>
                    ❤️ Likes{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {metrics ? fmtNumber(metrics.like_count) : '—'}
                    </span>
                  </span>
                  <span>
                    💬 Replies{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {metrics ? fmtNumber(metrics.reply_count) : '—'}
                    </span>
                  </span>
                  <span>
                    👁 Impressions{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {metrics && typeof metrics.impression_count === 'number'
                        ? fmtNumber(metrics.impression_count)
                        : '—'}
                    </span>
                  </span>
                  <span>
                    🔗 Quotes{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {metrics ? fmtNumber(metrics.quote_count) : '—'}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Button asChild variant="outline" className="sm:w-fit w-full">
                    <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                      <span className="inline-flex items-center gap-2">
                        <ExternalLink size={16} />
                        View on X
                      </span>
                    </a>
                  </Button>

                  <Button
                    variant="destructive"
                    className="sm:w-fit w-full"
                    onClick={() => setConfirmTweetId(tweet.id)}
                    disabled={Boolean(deletingId)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trash2 size={16} />
                      Delete
                    </span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && items.length > 0 ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!canPrev) return
              const prevToken = page - 1 === 1 ? null : meta?.previousToken ?? storedPrevToken
              goToPage(page - 1, prevToken)
            }}
            disabled={!canPrev}
          >
            ← Previous
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">Page {page}</span>
          <Button
            variant="outline"
            onClick={() => {
              if (!meta?.nextToken) return
              goToPage(page + 1, meta.nextToken)
            }}
            disabled={!canNext}
          >
            Next →
          </Button>
        </div>
      ) : null}

      <AlertDialog.Root open={confirmTweetId !== null} onOpenChange={(open) => !open && setConfirmTweetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tweet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The tweet will be permanently removed from X.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => confirmTweetId && handleDelete(confirmTweetId)}
              disabled={Boolean(deletingId) || confirmTweetId === null}
            >
              {deletingId ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog.Root>
    </div>
  )
}
