'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ThreadDetailModal } from '@/components/thread-detail-modal'
import { cn } from '@/lib/utils'
import type { Thread } from '@/lib/supabase/types'
import { AI_MODELS, type AIModel } from '@/app/dashboard/generate/types'

interface ThreadUsage {
  threadCount: number
  limitCount: number
  remaining: number
  isLimited: boolean
  resetsAt: string
}

interface TrendItem {
  name: string
  tweetVolume: number | null
  url: string
}

interface GeneratedTweet {
  index: number
  text: string
  type: 'hook' | 'body' | 'cta'
  charCount: number
}

interface GenerateResponse {
  success: boolean
  threadId: string
  model: AIModel
  topic: string
  tweets: GeneratedTweet[]
  totalTweets: number
  usage?: {
    threadCount: number
    limitCount: number
    remaining: number
  }
  error?: string
}

type PostStatus = 'waiting' | 'posting' | 'posted' | 'failed'

interface PostResult {
  index: number
  text: string
  status: PostStatus
  url?: string | null
  error?: string
}

interface PostSummary {
  status: 'posted' | 'partial'
  totalPosted: number
  totalTweets: number
  firstTweetUrl: string | null
}

interface ToastData {
  id: number
  message: string
  type: 'success' | 'error'
  url?: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

type ThreadHistoryResponse =
  | { success: true; data: Thread[]; meta: PaginationMeta }
  | { success: false; error?: string }

function formatResetDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getNextResetISO() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
}

function getCharCount(text: string) {
  return text.length
}

function getCharColor(count: number) {
  if (count > 280) return 'text-red-400'
  if (count > 260) return 'text-amber-300'
  return 'text-emerald-300'
}

function getUsageClasses(usage: ThreadUsage | null) {
  if (!usage) {
    return 'border-border/60 bg-muted/40 text-muted-foreground'
  }
  if (usage.remaining === 0) {
    return 'border-red-500/40 bg-red-500/10 text-red-200'
  }
  if (usage.remaining === 1) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
  }
  return 'border-border/60 bg-muted/40 text-muted-foreground'
}

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

function formatHistoryDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function truncate(text: string, maxLength = 70) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

function TweetTextarea({
  value,
  onChange,
  isInvalid,
}: {
  value: string
  onChange: (next: string) => void
  isInvalid: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const handleResize = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [])

  useEffect(() => {
    handleResize(textareaRef.current)
  }, [value, handleResize])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
        handleResize(event.currentTarget)
      }}
      onInput={(event) => handleResize(event.currentTarget)}
      rows={1}
      className={cn(
        'w-full rounded-lg border bg-input/30 px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        'resize-none transition-colors',
        isInvalid ? 'border-red-500/60 focus-visible:ring-red-500/40' : 'border-input'
      )}
    />
  )
}

function QuotaBanner({ usage }: { usage: ThreadUsage | null }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm leading-relaxed break-words',
        getUsageClasses(usage)
      )}
    >
      {!usage && <span>Loading thread quota...</span>}
      {usage && usage.isLimited && <span>Monthly limit reached · Upgrade for unlimited threads</span>}
      {usage && !usage.isLimited && (
        <span>
          Thread quota: {usage.threadCount} / {usage.limitCount} used this month · Resets{' '}
          {formatResetDate(usage.resetsAt)}
        </span>
      )}
    </div>
  )
}

export function ThreadContent() {
  const [topic, setTopic] = useState('')
  const [topicMode, setTopicMode] = useState<'manual' | 'trend'>('manual')
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude')
  const [fromTrend, setFromTrend] = useState(false)
  const [tweetVolume, setTweetVolume] = useState<number | null | undefined>(undefined)
  const [isGenerating, setIsGenerating] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [generatedTweets, setGeneratedTweets] = useState<GeneratedTweet[]>([])
  const [editedTweets, setEditedTweets] = useState<string[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [postResults, setPostResults] = useState<PostResult[] | null>(null)
  const [postSummary, setPostSummary] = useState<PostSummary | null>(null)
  const [usage, setUsage] = useState<ThreadUsage | null>(null)
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [isTrendsLoading, setIsTrendsLoading] = useState(false)
  const [trendError, setTrendError] = useState<string | null>(null)
  const [trendsLocation, setTrendsLocation] = useState<'worldwide' | 'indonesia'>(
    'worldwide'
  )
  const [trendsRefreshKey, setTrendsRefreshKey] = useState(0)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyData, setHistoryData] = useState<{ data: Thread[]; meta: PaginationMeta } | null>(
    null
  )
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  const activeModel = useMemo(
    () => AI_MODELS.find((model) => model.value === selectedModel) ?? AI_MODELS[0],
    [selectedModel]
  )

  const addToast = useCallback((message: string, type: 'success' | 'error', url?: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type, url }])
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 5000)
  }, [])

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/thread/usage')
      const data = (await res.json()) as
        | (ThreadUsage & { success: true })
        | { success: false; error?: string }

      if ('success' in data && data.success) {
        setUsage({
          threadCount: data.threadCount,
          limitCount: data.limitCount,
          remaining: data.remaining,
          isLimited: data.isLimited,
          resetsAt: data.resetsAt,
        })
      } else {
        addToast(data.error ?? 'Failed to load thread quota.', 'error')
      }
    } catch {
      addToast('Network error while loading quota.', 'error')
    }
  }, [addToast])

  const loadHistory = useCallback(
    async (page: number) => {
      setHistoryLoading(true)
      try {
        const res = await fetch(`/api/thread/history?page=${page}`)
        const data = (await res.json()) as ThreadHistoryResponse

        if ('success' in data && data.success) {
          setHistoryData({ data: data.data, meta: data.meta })
        } else {
          addToast(data.error ?? 'Failed to load thread history.', 'error')
          setHistoryData({
            data: [],
            meta: { page, limit: 10, total: 0, totalPages: 1 },
          })
        }
      } catch {
        addToast('Network error while loading thread history.', 'error')
        setHistoryData({
          data: [],
          meta: { page, limit: 10, total: 0, totalPages: 1 },
        })
      } finally {
        setHistoryLoading(false)
      }
    },
    [addToast]
  )

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  useEffect(() => {
    if (topicMode !== 'trend') return
    let cancelled = false
    setIsTrendsLoading(true)
    setTrendError(null)
    fetch(`/api/twitter/trends?location=${trendsLocation}`)
      .then((res) => res.json())
      .then(
        (
          data:
            | { success: true; data: TrendItem[] }
            | { success: false; error?: string }
        ) => {
          if (cancelled) return
          if ('success' in data && data.success) {
            setTrends(data.data)
          } else {
            setTrendError(data.error ?? 'Failed to load trends.')
          }
        }
      )
      .catch(() => {
        if (!cancelled) {
          setTrendError('Network error while loading trends.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTrendsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [topicMode, trendsLocation, trendsRefreshKey])

  useEffect(() => {
    loadHistory(historyPage)
  }, [historyPage, loadHistory])

  async function handleGenerate(regenerate = false) {
    if (!topic.trim() || isGenerating) return
    if (usage?.isLimited) return

    setIsGenerating(true)
    if (!regenerate) {
      setPostResults(null)
      setPostSummary(null)
    }

    try {
      const res = await fetch('/api/ai/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          model: selectedModel,
          tweetVolume: fromTrend ? tweetVolume : undefined,
          fromTrend: fromTrend || undefined,
          threadId: regenerate ? threadId : undefined,
        }),
      })

      const data = (await res.json()) as GenerateResponse

      if (data.success) {
        setThreadId(data.threadId ?? threadId)
        setGeneratedTweets(data.tweets)
        setEditedTweets(data.tweets.map((tweet) => tweet.text))
        setPostResults(null)
        setPostSummary(null)
        if (!regenerate) {
          if (data.usage) {
            setUsage((prev) => {
              const limitCount = data.usage?.limitCount ?? prev?.limitCount ?? 5
              const threadCount = data.usage?.threadCount ?? prev?.threadCount ?? 0
              const remaining = data.usage?.remaining ?? Math.max(0, limitCount - threadCount)
              const resetsAt = prev?.resetsAt ?? getNextResetISO()
              return {
                threadCount,
                limitCount,
                remaining,
                isLimited: remaining === 0,
                resetsAt,
              }
            })
          } else {
            loadUsage()
          }
        }
      } else {
        addToast(data.error ?? 'Generation failed. Try again.', 'error')
      }
    } catch {
      addToast('Network error. Please try again.', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handlePostThread() {
    if (!threadId || isPosting) return

    const payloadTweets = editedTweets.map((tweet) => tweet.trim())
    const total = payloadTweets.length

    setIsPosting(true)
    setPostResults(
      payloadTweets.map((text, index) => ({
        index,
        text,
        status: index === 0 ? 'posting' : 'waiting',
      }))
    )

    try {
      const res = await fetch('/api/twitter/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, tweets: payloadTweets }),
      })

      const data = (await res.json()) as
        | {
            success: boolean
            status: 'posted' | 'partial' | 'failed'
            totalPosted: number
            firstTweetUrl: string | null
            tweets: { index: number; url: string | null; status: 'posted' | 'failed'; error?: string }[]
            error?: string
          }
        | { success: false; error?: string }

      if ('success' in data && data.success) {
        const nextResults = payloadTweets.map((text, index) => {
          const result = data.tweets.find((item) => item.index === index)
          return {
            index,
            text,
            status: result?.status ?? 'failed',
            url: result?.url,
            error: result?.error,
          } satisfies PostResult
        })

        setPostResults(nextResults)

        if (data.status === 'partial') {
          setPostSummary({
            status: 'partial',
            totalPosted: data.totalPosted,
            totalTweets: total,
            firstTweetUrl: data.firstTweetUrl,
          })
        } else {
          setPostSummary({
            status: 'posted',
            totalPosted: total,
            totalTweets: total,
            firstTweetUrl: data.firstTweetUrl,
          })
        }
        loadUsage()
        loadHistory(historyPage)
      } else {
        addToast(data.error ?? 'Failed to post thread.', 'error')
        setPostResults(null)
        setPostSummary(null)
      }
    } catch {
      addToast('Network error while posting thread.', 'error')
      setPostResults(null)
      setPostSummary(null)
    } finally {
      setIsPosting(false)
    }
  }

  function handleReset() {
    setTopic('')
    setTopicMode('manual')
    setSelectedModel('claude')
    setFromTrend(false)
    setTweetVolume(undefined)
    setThreadId(null)
    setGeneratedTweets([])
    setEditedTweets([])
    setIsGenerating(false)
    setIsPosting(false)
    setPostResults(null)
    setPostSummary(null)
  }

  const totalTweets = generatedTweets.length
  const hasGenerated = totalTweets > 0
  const isLimited = usage?.isLimited ?? false
  const hasLongTweet = editedTweets.some((tweet) => getCharCount(tweet) > 280)
  const historyRows = historyData?.data ?? []
  const historyMeta = historyData?.meta
  const totalHistoryPages = historyMeta?.totalPages ?? 1
  const showHistoryEmpty = !historyLoading && historyData !== null && historyRows.length === 0

  return (
    <div className="app-container py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <QuotaBanner usage={usage} />

        <Card className="border-border/60 bg-card/80 p-5 md:p-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-foreground text-base font-semibold">Topic input</h2>
              <p className="text-muted-foreground text-sm">
                Pilih topik manual atau ambil dari trend. AI akan menulis thread utuh untukmu.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['manual', 'trend'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTopicMode(mode)
                    if (mode === 'manual') {
                      setFromTrend(false)
                      setTweetVolume(undefined)
                    }
                  }}
                  className={cn(
                    'inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    topicMode === mode
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/70 hover:text-foreground'
                  )}
                >
                  {mode === 'manual' ? 'Manual' : 'From Trends'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <Label htmlFor="thread-topic">Topic</Label>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  id="thread-topic"
                  value={topic}
                  onChange={(event) => {
                    setTopic(event.target.value)
                    if (fromTrend) {
                      setFromTrend(false)
                      setTweetVolume(undefined)
                    }
                  }}
                  placeholder="e.g. How AI changes software jobs"
                />
                {fromTrend && tweetVolume && tweetVolume > 0 && (
                  <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 font-medium">
                    {tweetVolume.toLocaleString()} tweets
                  </span>
                )}
              </div>
            </div>

            {topicMode === 'trend' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Trending topics</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTrendsRefreshKey((key) => key + 1)}
                    disabled={isTrendsLoading}
                    className="h-8 px-2"
                  >
                    <RefreshCw size={14} className={cn(isTrendsLoading && 'animate-spin')} />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center rounded-lg border border-border bg-muted/30 p-1 gap-1 w-full sm:w-fit">
                  <button
                    onClick={() => setTrendsLocation('worldwide')}
                    className={cn(
                      'flex flex-1 items-center justify-center h-9 min-h-0 gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
                      trendsLocation === 'worldwide'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Globe size={13} />
                    Worldwide
                  </button>
                  <button
                    onClick={() => setTrendsLocation('indonesia')}
                    className={cn(
                      'flex flex-1 items-center justify-center h-9 min-h-0 gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
                      trendsLocation === 'indonesia'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <MapPin size={13} />
                    Indonesia
                  </button>
                </div>

                {isTrendsLoading && (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                )}

                {!isTrendsLoading && trendError && (
                  <div className="text-sm text-red-300">{trendError}</div>
                )}

                {!isTrendsLoading && !trendError && (
                  <div className="grid grid-cols-2 gap-3">
                    {trends.map((trend) => (
                      <button
                        key={trend.name}
                        type="button"
                        onClick={() => {
                          setTopic(trend.name)
                          setFromTrend(true)
                          setTweetVolume(trend.tweetVolume)
                        }}
                        className={cn(
                          'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition',
                          'border-border bg-background/60 hover:border-primary/60 hover:bg-primary/10'
                        )}
                      >
                        <div className="text-sm font-medium text-foreground">{trend.name}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {trend.tweetVolume && trend.tweetVolume > 0
                            ? `${trend.tweetVolume.toLocaleString()} tweets`
                            : 'Trending'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>AI Model</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => setSelectedModel(model.value)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 font-medium transition-all text-left',
                      selectedModel === model.value
                        ? model.selectedClass
                        : 'border-border bg-background text-muted-foreground hover:border-border/60 hover:text-foreground'
                    )}
                  >
                    <span className="text-base leading-none">
                      {model.icon} {model.label}
                    </span>
                    <span className="text-xs opacity-70 font-normal">{model.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => handleGenerate(false)}
              disabled={!topic.trim() || isGenerating || isLimited}
              className="gap-2 w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating thread...
                </>
              ) : (
                'Generate Thread'
              )}
            </Button>
          </div>
        </Card>

        {hasGenerated && (
          <Card className="border-border/60 bg-card/80 p-5 md:p-6">
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={cn('border px-2 py-1 text-xs', activeModel.badgeClass)}>
                    {activeModel.badge}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{totalTweets} tweets</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <RefreshCw size={14} />
                  Regenerate
                </Button>
              </div>

              <div className="space-y-5">
                {generatedTweets.map((tweet, index) => {
                  const text = editedTweets[index] ?? tweet.text
                  const charCount = getCharCount(text)
                  const isInvalid = charCount > 280
                  const badgeText =
                    tweet.type === 'hook'
                      ? 'Hook'
                      : tweet.type === 'cta'
                        ? 'CTA'
                        : `${index + 1} of ${totalTweets}`
                  const badgeClass =
                    tweet.type === 'hook'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : tweet.type === 'cta'
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        : 'bg-muted text-muted-foreground border-border'

                  return (
                    <div key={tweet.index} className="relative">
                      {index < totalTweets - 1 && (
                        <div className="absolute left-3 top-14 bottom-0 w-px bg-border/60" />
                      )}
                      <div className="relative rounded-xl border border-border bg-background/70 p-4 pl-8">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge className={cn('border px-2 py-1 text-xs', badgeClass)}>
                            {badgeText}
                          </Badge>
                          <span
                            className={cn(
                              'text-xs font-medium shrink-0',
                              getCharColor(charCount)
                            )}
                          >
                            {charCount} chars
                          </span>
                        </div>
                        <div className="mt-3">
                          <TweetTextarea
                            value={text}
                            onChange={(next) =>
                              setEditedTweets((prev) => {
                                const copy = [...prev]
                                copy[index] = next
                                return copy
                              })
                            }
                            isInvalid={isInvalid}
                          />
                          {isInvalid && (
                            <p className="mt-2 text-xs text-red-300">Too long — shorten this tweet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {postSummary ? (
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  {postSummary.status === 'posted' ? (
                    <>
                      <h3 className="text-base font-semibold text-foreground">Thread posted!</h3>
                      <p className="text-sm text-muted-foreground">
                        {postSummary.totalTweets}/{postSummary.totalTweets} tweets posted successfully
                      </p>
                      {postSummary.firstTweetUrl && (
                        <a
                          href={postSummary.firstTweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm text-primary"
                        >
                          View thread on X →
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-semibold text-foreground">Thread partially posted</h3>
                      <p className="text-sm text-muted-foreground">
                        {postSummary.totalPosted}/{postSummary.totalTweets} tweets posted
                      </p>
                      <div className="mt-3 space-y-2">
                        {postResults?.map((result) => (
                          <div
                            key={result.index}
                            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs"
                          >
                            <span className="text-muted-foreground">#{result.index + 1}</span>
                            <span className="flex-1 min-w-0 px-3 text-foreground">
                              {truncate(result.text, 60)}
                            </span>
                            <span
                              className={cn(
                                'font-medium',
                                result.status === 'posted' ? 'text-emerald-300' : 'text-red-300'
                              )}
                            >
                              {result.status === 'posted' ? 'Posted' : 'Failed'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Posted tweets are already live on X
                      </p>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4 w-full sm:w-auto"
                    onClick={handleReset}
                  >
                    Create another thread
                  </Button>
                </div>
              ) : isPosting && postResults ? (
                <div className="space-y-2">
                  {postResults.map((result) => (
                    <div
                      key={result.index}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-xs"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground">
                        {result.index + 1}
                      </span>
                      <span className="flex-1 min-w-0 text-foreground">
                        {truncate(result.text, 60)}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {result.status === 'waiting' && (
                          <span className="inline-flex items-center gap-2">
                            <Clock size={12} />
                            Waiting
                          </span>
                        )}
                        {result.status === 'posting' && (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" />
                            Posting...
                          </span>
                        )}
                        {result.status === 'posted' && (
                          <span className="inline-flex items-center gap-2 text-emerald-300">
                            <CheckCircle2 size={12} />
                            Posted
                          </span>
                        )}
                        {result.status === 'failed' && (
                          <span className="inline-flex items-center gap-2 text-red-300">
                            <XCircle size={12} />
                            Failed
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sticky bottom-4 sm:static">
                  <Button
                    type="button"
                    onClick={handlePostThread}
                    disabled={hasLongTweet || isPosting}
                    className="w-full"
                  >
                    Post Thread ({totalTweets} tweets)
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <h2 className="text-foreground text-base font-semibold">Thread History</h2>
            <p className="text-muted-foreground text-sm">Semua thread yang pernah kamu buat</p>
          </div>

          <Card className="border-border/60 bg-card/80">
            {showHistoryEmpty ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                  <FileText size={20} className="text-muted-foreground" />
                </div>
                <div className="text-sm text-muted-foreground">
                  Belum ada thread. Buat thread pertamamu di atas!
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">Topic</th>
                      <th className="px-4 py-3 text-left font-medium">Model</th>
                      <th className="px-4 py-3 text-left font-medium">Tweets</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading &&
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="border-b border-border/60">
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-56" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-5 w-16" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-10" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-5 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-8 w-8" />
                          </td>
                        </tr>
                      ))}

                    {!historyLoading &&
                      historyRows.map((thread) => {
                        const statusStyle = THREAD_STATUS_STYLES[thread.status]
                        const modelStyle = MODEL_STYLES[thread.model]

                        return (
                          <tr
                            key={thread.id}
                            className="border-b border-border/60 transition-colors hover:bg-muted/30 cursor-pointer"
                            onClick={() => setSelectedThreadId(thread.id)}
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="line-clamp-2 text-foreground">{thread.topic}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={cn('border px-2 py-1 text-xs', modelStyle.className)}>
                                {modelStyle.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-foreground">{thread.total_tweets}</td>
                            <td className="px-4 py-3">
                              <Badge className={cn('border px-2 py-1 text-xs', statusStyle.className)}>
                                {statusStyle.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatHistoryDate(thread.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              {thread.first_tweet_url ? (
                                <Button variant="ghost" size="icon" asChild>
                                  <a
                                    href={thread.first_tweet_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label="Open thread"
                                  >
                                    <ExternalLink size={16} />
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {!showHistoryEmpty && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                disabled={historyPage === 1 || historyLoading}
                className="gap-2"
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {historyPage} of {totalHistoryPages}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))
                }
                disabled={historyPage >= totalHistoryPages || historyLoading}
                className="gap-2"
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ThreadDetailModal threadId={selectedThreadId} onClose={() => setSelectedThreadId(null)} />

      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 flex flex-col gap-2 z-[var(--z-toast)] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-xl border pointer-events-auto w-full sm:w-[320px]',
              toast.type === 'success'
                ? 'bg-green-950 border-green-800/60 text-green-200'
                : 'bg-red-950 border-red-800/60 text-red-200'
            )}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.url && (
              <a
                href={toast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 opacity-70 hover:opacity-100"
                aria-label="View thread"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
