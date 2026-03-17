'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, SearchX } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AnalyticsPanel } from './AnalyticsPanel'
import { ReplyModal } from './ReplyModal'
import { ThreadCard } from './ThreadCard'
import type {
  DiscoveredThread,
  DiscoverResponse,
  GenerateReplyResponse,
  HistoryResponse,
  PostReplyResponse,
  ReplyHistoryItem,
  ReplyOption,
} from '../types'

type ReplyTone = 'educational' | 'bold' | 'curious'
type ReplyModel = 'claude' | 'openai'

type ToastData = {
  id: number
  type: 'success' | 'error' | 'warning'
  message: string
  url?: string
}

const DEFAULT_KEYWORDS = ['AI', 'programming', 'tech', 'Indonesia']

function parseKeywordInput(value: string): string[] {
  const parts = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return parts.length > 0 ? parts : DEFAULT_KEYWORDS
}

function getRetryMinutes(payload: Record<string, unknown>): number | null {
  if (typeof payload.retryAfter === 'number' && Number.isFinite(payload.retryAfter)) {
    return Math.max(1, Math.ceil(payload.retryAfter / 60))
  }

  if (typeof payload.resetAt === 'string') {
    const resetAtMs = new Date(payload.resetAt).getTime()
    if (!Number.isNaN(resetAtMs)) {
      const diffMinutes = Math.ceil((resetAtMs - Date.now()) / 60_000)
      return Math.max(1, diffMinutes)
    }
  }

  return null
}

function toErrorMessage(fallback: string, payload: Record<string, unknown>): string {
  return typeof payload.error === 'string' && payload.error ? payload.error : fallback
}

function useReplyHunter() {
  const [threads, setThreads] = useState<DiscoveredThread[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = useState(false)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS)

  const [selectedThread, setSelectedThread] = useState<DiscoveredThread | null>(null)

  const [replyOptions, setReplyOptions] = useState<ReplyOption[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [selectedTone, setSelectedTone] = useState<ReplyTone>('educational')
  const [selectedModel, setSelectedModel] = useState<ReplyModel>('claude')

  const [isPosting, setIsPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const [history, setHistory] = useState<ReplyHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const fetchThreads = useCallback(async (nextKeywords?: string[]) => {
    const activeKeywords = nextKeywords && nextKeywords.length > 0 ? nextKeywords : keywords

    setKeywords(activeKeywords)
    setIsLoadingThreads(true)
    setDiscoverError(null)

    try {
      const params = new URLSearchParams()
      params.set('keywords', activeKeywords.join(','))

      const res = await fetch(`/api/reply-hunter/discover?${params.toString()}`)
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>

      if (res.ok && payload.success === true) {
        const json = payload as DiscoverResponse
        setThreads(json.data.slice(0, 20))
        return
      }

      if (res.status === 429) {
        const minutes = getRetryMinutes(payload)
        const countdown = minutes ? ` Coba lagi dalam ${minutes} menit.` : ''
        setDiscoverError(`Rate limit tercapai.${countdown}`)
      } else {
        setDiscoverError(toErrorMessage('Gagal mengambil thread. Coba lagi.', payload))
      }
      setThreads([])
    } catch {
      setDiscoverError('Network error. Coba lagi.')
      setThreads([])
    } finally {
      setIsLoadingThreads(false)
    }
  }, [keywords])

  const selectThread = useCallback((thread: DiscoveredThread) => {
    setSelectedThread(thread)
    setReplyOptions([])
    setGenerateError(null)
    setPostError(null)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedThread(null)
    setReplyOptions([])
    setGenerateError(null)
    setPostError(null)
  }, [])

  const generateReplies = useCallback(async (tone: ReplyTone, model: ReplyModel) => {
    if (!selectedThread) return

    setSelectedTone(tone)
    setSelectedModel(model)
    setIsGenerating(true)
    setGenerateError(null)
    setPostError(null)

    try {
      const res = await fetch('/api/reply-hunter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetId: selectedThread.tweetId,
          tweetText: selectedThread.text,
          authorHandle: selectedThread.authorHandle,
          tone,
          model,
        }),
      })

      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>

      if (res.ok && payload.success === true) {
        const json = payload as GenerateReplyResponse
        setReplyOptions(json.data ?? [])
        return
      }

      setReplyOptions([])
      setGenerateError(toErrorMessage('Gagal generate reply. Coba lagi.', payload))
    } catch {
      setReplyOptions([])
      setGenerateError('Network error. Coba lagi.')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedThread])

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    setHistoryError(null)

    try {
      const res = await fetch('/api/reply-hunter/history?limit=10')
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>

      if (res.ok && payload.success === true) {
        const json = payload as HistoryResponse
        setHistory(json.data)
        return
      }

      setHistory([])
      setHistoryError(toErrorMessage('Gagal mengambil history reply.', payload))
    } catch {
      setHistory([])
      setHistoryError('Network error. Coba lagi.')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const postReply = useCallback(async (replyText: string, toneLabel: ReplyTone) => {
    if (!selectedThread) {
      return { success: false, partialFailure: false, replyTweetId: undefined }
    }

    setIsPosting(true)
    setPostError(null)

    try {
      const res = await fetch('/api/reply-hunter/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalTweetId: selectedThread.tweetId,
          originalTweetText: selectedThread.text,
          originalAuthorHandle: selectedThread.authorHandle,
          replyText: replyText.trim(),
          toneLabel,
        }),
      })

      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>

      if (res.ok && payload.success === true) {
        const json = payload as PostReplyResponse
        await fetchHistory()
        return {
          success: true,
          partialFailure: Boolean(json.partialFailure),
          replyTweetId: json.replyTweetId,
        }
      }

      if (res.status === 429) {
        const minutes = getRetryMinutes(payload)
        const countdown = minutes ? ` Coba lagi dalam ${minutes} menit.` : ''
        setPostError(`Rate limit tercapai. Maksimal 10 reply per jam.${countdown}`)
      } else if (res.status === 409) {
        setPostError('Kamu sudah reply tweet ini dalam 24 jam terakhir.')
      } else if (res.status === 422) {
        setPostError('Tweet tidak dapat di-reply. Mungkin sudah dihapus.')
      } else {
        setPostError('Gagal posting reply. Coba lagi.')
      }

      return { success: false, partialFailure: false, replyTweetId: undefined }
    } catch {
      setPostError('Gagal posting reply. Coba lagi.')
      return { success: false, partialFailure: false, replyTweetId: undefined }
    } finally {
      setIsPosting(false)
    }
  }, [fetchHistory, selectedThread])

  return {
    threads,
    isLoadingThreads,
    discoverError,
    keywords,
    selectedThread,
    replyOptions,
    isGenerating,
    generateError,
    selectedTone,
    selectedModel,
    isPosting,
    postError,
    history,
    isLoadingHistory,
    historyError,
    fetchThreads,
    selectThread,
    closeModal,
    generateReplies,
    postReply,
    fetchHistory,
    setSelectedTone,
    setSelectedModel,
  }
}

function ThreadCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-4/5 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-9 w-32 rounded bg-muted" />
    </div>
  )
}

export function ReplyHunterContent() {
  const {
    threads,
    isLoadingThreads,
    discoverError,
    keywords,
    selectedThread,
    replyOptions,
    isGenerating,
    generateError,
    selectedTone,
    selectedModel,
    isPosting,
    postError,
    history,
    isLoadingHistory,
    historyError,
    fetchThreads,
    selectThread,
    closeModal,
    generateReplies,
    postReply,
    fetchHistory,
    setSelectedTone,
    setSelectedModel,
  } = useReplyHunter()

  const [keywordsInput, setKeywordsInput] = useState(DEFAULT_KEYWORDS.join(', '))
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    setKeywordsInput(keywords.join(', '))
  }, [keywords])

  useEffect(() => {
    fetchThreads(DEFAULT_KEYWORDS)
    fetchHistory()
  }, [])

  const hasThreads = threads.length > 0

  function addToast(type: ToastData['type'], message: string, url?: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, message, url }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 5000)
  }

  async function handleGenerate(tone: ReplyTone, model: ReplyModel) {
    await generateReplies(tone, model)
  }

  async function handlePost(replyText: string, toneLabel: ReplyTone) {
    const result = await postReply(replyText, toneLabel)
    if (!result.success) return false

    const url = result.replyTweetId ? `https://x.com/rfanazhari/status/${result.replyTweetId}` : undefined
    if (result.partialFailure) {
      addToast('warning', 'Posted but history may not be saved.', url)
    } else {
      addToast('success', 'Reply posted!', url)
    }
    closeModal()
    return true
  }

  return (
    <div className="app-container py-6 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Cari thread ramai berdasarkan keyword lalu balas pakai AI.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={keywordsInput}
                onChange={(event) => setKeywordsInput(event.target.value)}
                placeholder="AI, programming, tech, Indonesia"
              />
              <Button
                onClick={() => fetchThreads(parseKeywordInput(keywordsInput))}
                disabled={isLoadingThreads}
                className="w-full sm:w-auto"
              >
                {isLoadingThreads ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
          </div>

          {isLoadingThreads ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ThreadCardSkeleton key={idx} />
              ))}
            </div>
          ) : discoverError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p>{discoverError}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => fetchThreads(parseKeywordInput(keywordsInput))}
              >
                Retry
              </Button>
            </div>
          ) : hasThreads ? (
            <div className="space-y-3">
              {threads.slice(0, 20).map((thread) => (
                <ThreadCard key={thread.tweetId} thread={thread} onReply={selectThread} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <SearchX size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Tidak ada thread ditemukan. Coba ubah keyword.</p>
            </div>
          )}
        </section>

        <div className="lg:col-span-2">
          <AnalyticsPanel
            history={history}
            isLoading={isLoadingHistory}
            error={historyError}
            onRetry={fetchHistory}
          />
        </div>
      </div>

      <ReplyModal
        thread={selectedThread}
        selectedTone={selectedTone}
        selectedModel={selectedModel}
        replyOptions={replyOptions}
        isGenerating={isGenerating}
        generateError={generateError}
        isPosting={isPosting}
        postError={postError}
        onToneChange={setSelectedTone}
        onModelChange={setSelectedModel}
        onGenerate={handleGenerate}
        onPost={handlePost}
        onClose={closeModal}
      />

      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 flex flex-col gap-2 z-[var(--z-toast)] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-xl border pointer-events-auto w-full sm:w-[340px] ${
              toast.type === 'success'
                ? 'bg-green-950 border-green-800/60 text-green-200'
                : toast.type === 'warning'
                  ? 'bg-yellow-950 border-yellow-800/60 text-yellow-200'
                  : 'bg-red-950 border-red-800/60 text-red-200'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.url ? (
              <a
                href={toast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 opacity-80 hover:opacity-100"
                aria-label="View reply"
              >
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
