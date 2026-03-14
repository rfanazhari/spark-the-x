export interface TweetOption {
  text: string
  hook: string
  hashtags: string[]
  char_count: number
}

export interface GenerateResults {
  success: boolean
  model: 'claude' | 'openai'
  options: TweetOption[]
  generatedAt: string
}

export interface SelectedTweet {
  text: string
  source: 'Claude' | 'OpenAI'
  hashtags: string[]
  optionKey: string
}

export interface ToastData {
  id: number
  message: string
  type: 'success' | 'error'
  url?: string
}

export const PILLARS = [
  { label: '💡 Tips & Tutorial', value: 'Tips & Tutorial' },
  { label: '🔥 Opini', value: 'Opini' },
  { label: '👀 Behind the Scene', value: 'Behind the Scene' },
  { label: '✨ Auto', value: 'Auto' },
] as const

export type PillarValue = (typeof PILLARS)[number]['value']

export type AIModel = 'claude' | 'openai'

export const AI_MODELS = [
  {
    value: 'claude' as AIModel,
    label: 'Claude Sonnet',
    icon: '🤖',
    badge: '🤖 Claude Sonnet',
    description: 'Sonnet',
    selectedClass: 'border-purple-500 bg-purple-500/10 text-purple-300',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  {
    value: 'openai' as AIModel,
    label: 'GPT-4o Mini',
    icon: '⚡',
    badge: '⚡ GPT-4o Mini',
    description: 'GPT-4o Mini',
    selectedClass: 'border-green-500 bg-green-500/10 text-green-300',
    badgeClass: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
] as const
