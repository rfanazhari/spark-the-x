'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DiscoveredThread, ReplyOption } from '../types'

type ReplyTone = 'educational' | 'bold' | 'curious'
type ReplyModel = 'claude' | 'openai'

interface ReplyModalProps {
  thread: DiscoveredThread | null
  selectedTone: ReplyTone
  selectedModel: ReplyModel
  replyOptions: ReplyOption[]
  isGenerating: boolean
  generateError: string | null
  isPosting: boolean
  postError: string | null
  onToneChange: (tone: ReplyTone) => void
  onModelChange: (model: ReplyModel) => void
  onGenerate: (tone: ReplyTone, model: ReplyModel) => Promise<void>
  onPost: (replyText: string, toneLabel: ReplyTone) => Promise<boolean>
  onClose: () => void
}

const toneOptions: { value: ReplyTone; label: string }[] = [
  { value: 'educational', label: 'Educational' },
  { value: 'bold', label: 'Bold' },
  { value: 'curious', label: 'Curious' },
]

const modelOptions: { value: ReplyModel; label: string }[] = [
  { value: 'claude', label: 'Claude Sonnet' },
  { value: 'openai', label: 'GPT-4o Mini' },
]

export function ReplyModal({
  thread,
  selectedTone,
  selectedModel,
  replyOptions,
  isGenerating,
  generateError,
  isPosting,
  postError,
  onToneChange,
  onModelChange,
  onGenerate,
  onPost,
  onClose,
}: ReplyModalProps) {
  const [draftReply, setDraftReply] = useState('')

  useEffect(() => {
    if (!thread) {
      setDraftReply('')
      return
    }

    setDraftReply('')
  }, [thread?.tweetId])

  const charCount = draftReply.length
  const canPost = useMemo(() => {
    return draftReply.trim().length > 0 && charCount <= 280 && !isPosting
  }, [charCount, draftReply, isPosting])

  if (!thread) return null

  return (
    <Dialog
      open={Boolean(thread)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPosting) onClose()
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex max-h-[92vh] flex-col">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Reply Hunter</DialogTitle>
            <DialogDescription>
              Replying to @{thread.authorHandle}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-3 max-h-40 overflow-y-auto">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{thread.text}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tone</p>
              <div className="flex flex-wrap gap-2">
                {toneOptions.map((tone) => (
                  <Button
                    key={tone.value}
                    variant={selectedTone === tone.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onToneChange(tone.value)}
                    disabled={isGenerating || isPosting}
                  >
                    {tone.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Model</p>
              <div className="flex flex-wrap gap-2">
                {modelOptions.map((model) => (
                  <Button
                    key={model.value}
                    variant={selectedModel === model.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onModelChange(model.value)}
                    disabled={isGenerating || isPosting}
                  >
                    {model.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => onGenerate(selectedTone, selectedModel)}
              disabled={isGenerating || isPosting}
              className="w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Replies'
              )}
            </Button>

            {generateError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {generateError}
              </div>
            ) : null}

            {replyOptions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Pilih salah satu:</p>
                {replyOptions.map((option, idx) => (
                  <div key={`${option.text}-${idx}`} className="rounded-xl border border-border bg-background p-3 space-y-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{option.text}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDraftReply(option.text)}
                      disabled={isPosting}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Edit sebelum post</p>
              <textarea
                value={draftReply}
                onChange={(event) => setDraftReply(event.target.value)}
                rows={5}
                placeholder="Pilih reply option dulu, lalu edit di sini..."
                className={cn(
                  'w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                  'resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors',
                  charCount > 280 ? 'border-destructive/60' : 'border-input'
                )}
                disabled={isPosting}
              />
              <p className={cn('text-right text-xs font-mono', charCount > 280 ? 'text-destructive' : 'text-muted-foreground')}>
                {charCount}/280
              </p>
            </div>

            {postError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {postError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border px-5 py-4">
            <Button variant="ghost" onClick={onClose} disabled={isPosting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={() => onPost(draftReply, selectedTone)} disabled={!canPost} className="w-full sm:w-auto">
              {isPosting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Reply'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
