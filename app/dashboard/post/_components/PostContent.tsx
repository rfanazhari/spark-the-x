'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, ExternalLink, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_CHARS = 280
const WARN_THRESHOLD = 260
const STORAGE_KEY = 'post_history'
const MAX_HISTORY = 10

interface PostRecord {
  tweetId: string
  url: string
  text: string
  postedAt: string
}

interface Toast {
  type: 'success' | 'error'
  message: string
  url?: string
}

const inputClass =
  'w-full rounded-lg border border-border bg-input/30 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-none'

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

export function PostContent() {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postUiState, setPostUiState] = useState<'idle' | 'posted' | 'error'>('idle')
  const [toast, setToast] = useState<Toast | null>(null)
  const [history, setHistory] = useState<PostRecord[]>([])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const postUiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setHistory(JSON.parse(stored) as PostRecord[])
    } catch {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (postUiTimer.current) clearTimeout(postUiTimer.current)
    }
  }, [])

  function showToast(t: Toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(t)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  function saveToHistory(record: PostRecord) {
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, MAX_HISTORY)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  async function handlePost() {
    if (!text.trim() || text.length > MAX_CHARS || posting) return
    setPosting(true)
    setPostUiState('idle')
    try {
      const res = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        saveToHistory({
          tweetId: json.tweetId,
          url: json.url,
          text: text.trim(),
          postedAt: json.postedAt,
        })
        setText('')
        setPostUiState('posted')
        if (postUiTimer.current) clearTimeout(postUiTimer.current)
        postUiTimer.current = setTimeout(() => setPostUiState('idle'), 2000)
        showToast({ type: 'success', message: 'Tweet posted!', url: json.url })
      } else {
        setPostUiState('error')
        if (postUiTimer.current) clearTimeout(postUiTimer.current)
        postUiTimer.current = setTimeout(() => setPostUiState('idle'), 2000)
        showToast({ type: 'error', message: json.error ?? 'Failed to post tweet.' })
      }
    } catch {
      setPostUiState('error')
      if (postUiTimer.current) clearTimeout(postUiTimer.current)
      postUiTimer.current = setTimeout(() => setPostUiState('idle'), 2000)
      showToast({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setPosting(false)
    }
  }

  const charCount = text.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount >= WARN_THRESHOLD
  const canPost = text.trim().length > 0 && !overLimit && !posting

  return (
    <div className="app-container py-6 md:py-8 sticky-footer-offset sm:pb-6 md:pb-8">
      {toast && (
        <div
          className={`fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-4 right-4 sm:top-4 sm:left-auto sm:right-4 z-[60] flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all w-auto max-w-full sm:max-w-sm ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          <span>{toast.message}</span>
          {toast.url && (
            <a
              href={toast.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
            >
              View tweet <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h2 className="text-muted-foreground uppercase tracking-wide text-sm font-semibold">Compose Tweet</h2>

          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's happening?"
            className={inputClass}
            disabled={posting}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span
              className={`text-xs font-mono tabular-nums self-end text-right sm:self-auto ${
                overLimit
                  ? 'text-destructive font-semibold'
                  : nearLimit
                    ? 'text-amber-400'
                    : 'text-muted-foreground'
              }`}
            >
              {charCount} / {MAX_CHARS}
            </span>

            <Button
              onClick={handlePost}
              disabled={!canPost}
              size="default"
              className="hidden sm:inline-flex w-full sm:w-auto"
            >
              {posting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Posting…
                </span>
              ) : postUiState === 'posted' ? (
                <span className="inline-flex items-center gap-2">
                  <CheckCircle size={16} />
                  Posted
                </span>
              ) : postUiState === 'error' ? (
                <span className="inline-flex items-center gap-2">
                  <XCircle size={16} />
                  Failed
                </span>
              ) : (
                'Post Tweet'
              )}
            </Button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Posts ({history.length})
            </h2>

            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.tweetId}
                  className="rounded-lg border border-border bg-card px-4 py-3 space-y-2"
                >
                  <p className="text-sm text-foreground leading-snug line-clamp-2 break-words">{item.text}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={11} />
                      {formatRelative(item.postedAt)}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background px-4 pt-3 pb-[env(safe-area-inset-bottom,0px)]">
        <Button
          onClick={handlePost}
          disabled={!canPost || postUiState === 'posted' || postUiState === 'error'}
          size="lg"
          className="w-full h-11"
        >
          {posting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Posting…
            </span>
          ) : postUiState === 'posted' ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle size={16} />
              Posted
            </span>
          ) : postUiState === 'error' ? (
            <span className="inline-flex items-center gap-2">
              <XCircle size={16} />
              Failed
            </span>
          ) : (
            'Post Tweet'
          )}
        </Button>
      </div>
    </div>
  )
}
