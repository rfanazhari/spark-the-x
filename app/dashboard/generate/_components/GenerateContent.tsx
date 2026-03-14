'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { InputSection } from './InputSection'
import { ResultsSection } from './ResultsSection'
import { PreviewModal } from './PreviewModal'
import type { GenerateResults, SelectedTweet, TweetOption, ToastData, PillarValue, AIModel } from '../types'

export function GenerateContent() {
  const searchParams = useSearchParams()

  const [trend, setTrend] = useState(searchParams.get('trend') ?? '')
  const [volume] = useState(Number(searchParams.get('volume') ?? '0'))
  const [pillar, setPillar] = useState<PillarValue>('Auto')
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude')
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<GenerateResults | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [selectedTweet, setSelectedTweet] = useState<SelectedTweet | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [postedOptionKeys, setPostedOptionKeys] = useState<Set<string>>(new Set())

  function addToast(message: string, type: 'success' | 'error', url?: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type, url }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }

  async function handleGenerate() {
    if (!trend.trim()) return
    setIsGenerating(true)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trend, tweetVolume: volume, pillar, model: selectedModel }),
      })
      const data = (await res.json()) as GenerateResults & { error?: string }
      if (data.success) {
        setResults(data)
        setHasGenerated(true)
        setPostedOptionKeys(new Set())
      } else {
        addToast(data.error ?? 'Generation failed. Try again.', 'error')
      }
    } catch {
      addToast('Network error. Please try again.', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSelectTweet(tweet: TweetOption, source: 'Claude' | 'OpenAI', optionKey: string) {
    setSelectedTweet({ text: tweet.text, source, hashtags: tweet.hashtags, optionKey })
    setIsModalOpen(true)
  }

  async function handlePost(text: string) {
    const optionKey = selectedTweet?.optionKey
    setIsPosting(true)
    try {
      const res = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json()) as { success: boolean; url?: string; error?: string }
      if (data.success) {
        if (optionKey) {
          setPostedOptionKeys((prev) => new Set(prev).add(optionKey))
        }
        setIsModalOpen(false)
        setSelectedTweet(null)
        addToast('Tweet posted! 🎉', 'success', data.url)
      } else {
        addToast(data.error ?? 'Failed to post tweet.', 'error')
      }
    } catch {
      addToast('Network error. Please try again.', 'error')
    } finally {
      setIsPosting(false)
    }
  }

  const showResults = hasGenerated || isGenerating

  return (
    <div className="app-container py-6 md:py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <InputSection
          trend={trend}
          setTrend={setTrend}
          volume={volume}
          pillar={pillar}
          setPillar={setPillar}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isGenerating={isGenerating}
          hasGenerated={hasGenerated}
          onGenerate={handleGenerate}
        />

        {showResults && results && (
          <ResultsSection
            results={results}
            pillar={pillar}
            isLoading={isGenerating}
            postedOptionKeys={postedOptionKeys}
            onSelectTweet={handleSelectTweet}
          />
        )}
      </div>

      {isModalOpen && selectedTweet && (
        <PreviewModal
          tweet={selectedTweet}
          isPosting={isPosting}
          isPosted={postedOptionKeys.has(selectedTweet.optionKey)}
          onPost={handlePost}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTweet(null)
          }}
        />
      )}

      {/* Toast container */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 flex flex-col gap-2 z-[var(--z-toast)] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-xl border pointer-events-auto w-full sm:w-[320px] ${
              toast.type === 'success'
                ? 'bg-green-950 border-green-800/60 text-green-200'
                : 'bg-red-950 border-red-800/60 text-red-200'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.url && (
              <a
                href={toast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 opacity-70 hover:opacity-100"
                aria-label="View tweet"
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
