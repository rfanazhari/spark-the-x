import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PILLARS, AI_MODELS, type PillarValue, type AIModel } from '../types'

interface InputSectionProps {
  trend: string
  setTrend: (v: string) => void
  volume: number
  pillar: PillarValue
  setPillar: (v: PillarValue) => void
  selectedModel: AIModel
  setSelectedModel: (v: AIModel) => void
  isGenerating: boolean
  hasGenerated: boolean
  onGenerate: () => void
}

export function InputSection({
  trend,
  setTrend,
  volume,
  pillar,
  setPillar,
  selectedModel,
  setSelectedModel,
  isGenerating,
  hasGenerated,
  onGenerate,
}: InputSectionProps) {
  const activeModel = AI_MODELS.find((m) => m.value === selectedModel)!

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-foreground text-base font-semibold">
          <Sparkles size={18} className="text-primary" />
          Generate tweet options
        </h2>
        <p className="text-muted-foreground text-sm">
          Pilih trend, pilih pillar, pilih AI model, dan biarkan AI bikin tweetmu.
        </p>
      </div>

      {/* Trend input */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="trend-input">
          Trending Topic
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="trend-input"
            type="text"
            value={trend}
            onChange={(e) => setTrend(e.target.value)}
            placeholder="e.g. #AI2026"
            className={cn(
              'w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
              'transition-colors'
            )}
          />
          {volume > 0 && (
            <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {volume.toLocaleString()} tweets
            </span>
          )}
        </div>
      </div>

      {/* Pillar selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Content Pillar</label>
        {/* Stage 6: pill selectors may use `h-9` (36px) with `min-h-0` to avoid the global 44px baseline. */}
        <div className="flex flex-wrap gap-2">
          {PILLARS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPillar(value)}
              className={cn(
                'inline-flex items-center text-sm h-9 min-h-0 px-3 rounded-lg border font-medium transition-all',
                pillar === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Model selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">AI Model</label>
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

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !trend.trim()}
          size="default"
          className="gap-2 px-6 w-full sm:w-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating with {activeModel.label}...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              ✨ Generate
            </>
          )}
        </Button>

        {hasGenerated && !isGenerating && (
          <Button
            variant="outline"
            onClick={onGenerate}
            disabled={!trend.trim()}
            size="default"
            className="gap-2 w-full sm:w-auto"
          >
            <RefreshCw size={14} />
            Regenerate
          </Button>
        )}
      </div>
    </div>
  )
}
