'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SelectedTweet } from '../types'

interface PreviewModalProps {
  tweet: SelectedTweet
  isPosting: boolean
  isPosted: boolean
  onPost: (text: string) => void
  onClose: () => void
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const onChange = () => setMatches(mediaQuery.matches)
    onChange()
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [query])

  return matches
}

function extractHashtags(text: string): string[] {
  return (text.match(/\B#\w+/g) ?? []).filter((t, i, a) => a.indexOf(t) === i)
}

function CharCounter({ count }: { count: number }) {
  return (
    <span
      className={cn(
        'text-xs font-mono font-medium',
        count <= 260 ? 'text-green-400' : count <= 280 ? 'text-yellow-400' : 'text-red-400'
      )}
    >
      {count}/280
    </span>
  )
}

export function PreviewModal({ tweet, isPosting, isPosted, onPost, onClose }: PreviewModalProps) {
  const [text, setText] = useState(tweet.text)
  const hashtags = extractHashtags(text)
  const charCount = text.length
  const isMobile = useMediaQuery('(max-width: 639px)')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPosting) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [isPosting, onClose])

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-[70]"
        role="dialog"
        aria-modal="true"
        aria-label="Preview Tweet"
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => !isPosting && onClose()}
        />

        <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-card border-t border-border shadow-2xl max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          </div>

          <div className="w-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold">Preview Tweet</h2>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium border',
                    tweet.source === 'Claude'
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-green-500/15 text-green-400 border-green-500/30'
                  )}
                >
                  {tweet.source === 'Claude' ? '🤖 Claude' : '⚡ OpenAI'}
                </span>
              </div>
              <button
                onClick={() => !isPosting && onClose()}
                disabled={isPosting}
                className="tap-target rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1">
              {/* Edit area */}
              <div className="px-5 pt-4 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Edit Tweet</label>
                  <CharCounter count={charCount} />
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  className={cn(
                    'w-full rounded-lg border bg-background px-3 py-2.5 text-sm leading-relaxed',
                    'text-foreground placeholder:text-muted-foreground resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
                    'transition-colors',
                    charCount > 280 ? 'border-red-500/60' : 'border-input'
                  )}
                />
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="mx-5 border-t border-border" />

              {/* Tweet preview card */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Preview
                </p>
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      RF
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-none">Rfana Zhari</p>
                      <p className="text-xs text-muted-foreground mt-0.5">@rfanazhari</p>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">Just now</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pl-11">
                    {text || '...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 px-5 py-4 border-t border-border sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => !isPosting && onClose()}
                disabled={isPosting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onPost(text)}
                disabled={isPosted || isPosting || charCount === 0 || charCount > 280}
                className="gap-2 w-full sm:w-auto"
              >
                {isPosted ? (
                  'Sudah Diposting'
                ) : isPosting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    🚀 Post Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Preview Tweet"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isPosting && onClose()}
      />

      <div className="relative z-10 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold">Preview Tweet</h2>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium border',
                tweet.source === 'Claude'
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : 'bg-green-500/15 text-green-400 border-green-500/30'
              )}
            >
              {tweet.source === 'Claude' ? '🤖 Claude' : '⚡ OpenAI'}
            </span>
          </div>
          <button
            onClick={() => !isPosting && onClose()}
            disabled={isPosting}
            className="tap-target rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Edit area */}
          <div className="px-5 pt-4 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Edit Tweet</label>
              <CharCounter count={charCount} />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2.5 text-sm leading-relaxed',
                'text-foreground placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
                'transition-colors',
                charCount > 280 ? 'border-red-500/60' : 'border-input'
              )}
            />
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-border" />

          {/* Tweet preview card */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  RF
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">Rfana Zhari</p>
                  <p className="text-xs text-muted-foreground mt-0.5">@rfanazhari</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">Just now</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pl-11">{text || '...'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 px-5 py-4 border-t border-border sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => !isPosting && onClose()}
            disabled={isPosting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onPost(text)}
            disabled={isPosted || isPosting || charCount === 0 || charCount > 280}
            className="gap-2 w-full sm:w-auto"
          >
            {isPosted ? (
              'Sudah Diposting'
            ) : isPosting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send size={14} />
                🚀 Post Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
