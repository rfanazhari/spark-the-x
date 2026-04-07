import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { addAITrace, extractRequestId } from '@/lib/ai-trace'
import { getAuthUser } from '@/lib/auth'

interface TweetOption {
  text: string
  hook: string
  hashtags: string[]
  char_count: number
}

type AIModel = 'claude' | 'openai'

type OutputLanguage = 'Indonesian' | 'English'

const INDONESIAN_MARKERS = [
  'yang',
  'dan',
  'untuk',
  'dengan',
  'karena',
  'tidak',
  'bukan',
  'adalah',
  'sekarang',
  'lebih',
]

const ENGLISH_MARKERS = [
  'the',
  'and',
  'with',
  'without',
  'because',
  'founder',
  'builders',
  'startup',
  'market',
  'people',
]

const ENGAGEMENT_BAIT_PATTERNS = [
  /who else feels this\??/gi,
  /what do you think\??/gi,
]

const MOTIVATIONAL_PATTERNS = [
  /embrace the chaos/gi,
  /keep going/gi,
]

const LINKEDIN_PHRASE_PATTERNS = [
  /\bmove the needle\b/gi,
  /\binnovate\b/gi,
  /\bsee how that changes your results\b/gi,
  /\bleverage\b/gi,
  /\bthought leadership\b/gi,
  /\bunlock(?:ing)? potential\b/gi,
  /\bgame[- ]changer\b/gi,
  /\bsynergy\b/gi,
]

function detectLanguage(input: string): OutputLanguage {
  const text = ` ${input.toLowerCase()} `
  const idScore = INDONESIAN_MARKERS.reduce(
    (score, word) => (text.includes(` ${word} `) ? score + 1 : score),
    0
  )
  const enScore = ENGLISH_MARKERS.reduce(
    (score, word) => (text.includes(` ${word} `) ? score + 1 : score),
    0
  )

  if (idScore > enScore) return 'Indonesian'
  return 'English'
}

function isHashtagExplicitlyRequested(input: string): boolean {
  return /\b(hashtag|hashtags|tagar)\b/i.test(input)
}

function sanitizeTweetText(text: string, allowHashtags: boolean): string {
  let sanitized = text.trim()
  sanitized = sanitized.replace(/[\u2013\u2014]/g, '-')
  sanitized = sanitized.replace(/[!]+/g, '')
  sanitized = sanitized.replace(/\p{Extended_Pictographic}/gu, '')

  ENGAGEMENT_BAIT_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '')
  })
  MOTIVATIONAL_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '')
  })
  LINKEDIN_PHRASE_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '')
  })

  if (!allowHashtags) {
    sanitized = sanitized.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1')
  }

  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim()
  sanitized = sanitized.replace(/\?+\s*$/g, '').trim()

  if (sanitized.length > 280) {
    sanitized = sanitized.slice(0, 280).trim()
    sanitized = sanitized.replace(/\?+\s*$/g, '').trim()
  }

  return sanitized
}

function sanitizeHook(hook: string, language: OutputLanguage): string {
  let sanitized = hook.trim()
  sanitized = sanitized.replace(/[\u2013\u2014]/g, '-')
  sanitized = sanitized.replace(/[!]+/g, '')
  sanitized = sanitized.replace(/\p{Extended_Pictographic}/gu, '')
  sanitized = sanitized.replace(/\?+\s*$/g, '').trim()

  if (sanitized) return sanitized
  return language === 'Indonesian'
    ? 'hook ini provokatif dan bikin orang punya posisi yang jelas'
    : 'this hook takes a clear stance people will challenge'
}

function normalizeHashtags(rawHashtags: unknown, allowHashtags: boolean): string[] {
  if (!allowHashtags) return []
  if (!Array.isArray(rawHashtags)) return []

  return rawHashtags
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => /^#[\p{L}\p{N}_]+$/u.test(item))
    .slice(0, 3)
}

function buildSystemPrompt(language: OutputLanguage, allowHashtags: boolean): string {
  const languageRule =
    language === 'Indonesian'
      ? 'Write fully in Indonesian. Do not mix with English.'
      : 'Write fully in English. Do not mix with Indonesian.'

  const hashtagRule = allowHashtags
    ? 'Hashtags are allowed only because they were explicitly requested. Keep them minimal.'
    : 'Do not use hashtags. Keep the hashtags array empty.'

  return `You are a social media ghostwriter for a tech/AI founder on X.

VOICE:
- Gen Z, lowercase, dry, confident
- Opinionated but not arrogant
- Sounds like a founder who has shipped products and seen failure cycles

HARD RULES:
- No emojis
- No exclamation marks
- No motivational closings
- No generic engagement bait
- No corporate buzzwords or linkedin-style phrasing
- Avoid em dashes
- Keep each tweet short, blunt, and focused on one idea
- Hook must challenge or provoke with no preamble
- End with a statement that invites debate, never a question
- ${languageRule}
- ${hashtagRule}`
}

function buildUserPrompt(
  trend: string,
  tweetVolume: number,
  pillar: string,
  language: OutputLanguage,
  allowHashtags: boolean
): string {
  const volumeStr = tweetVolume > 0 ? ` (${tweetVolume.toLocaleString()} tweets)` : ''
  return `Generate 3 tweet options about the trending topic: ${trend}${volumeStr}.
Content Pillar: ${pillar}
Language: ${language}

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation, no code fences. Format:
[{"text":"tweet content here","hook":"why this hook works","hashtags":["#Tag1","#Tag2"],"char_count":120}]

Rules:
- Each tweet text must be max 280 characters
- char_count must equal the exact character count of the text field
- Adapt tone and format to the specified content pillar
- No emojis, no exclamation marks, no em dashes
- No motivational endings, no engagement bait
- Never use phrases like "move the needle", "innovate", or "see how that changes your results"
- Avoid linkedin voice and abstract business language
- Write like a person typing fast on X, not like a polished content deck
- Don't explain the point; make the point directly
- One idea per tweet
- ${allowHashtags ? 'Hashtags are allowed only if useful, max 3.' : 'hashtags must always be an empty array []' }`
}

function parseJsonOptions(raw: string, language: OutputLanguage, allowHashtags: boolean): TweetOption[] {
  const stripped = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const options = JSON.parse(stripped) as unknown

  if (!Array.isArray(options) || options.length !== 3) {
    throw new Error('AI response must be an array with exactly 3 options')
  }

  return options.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid tweet option format')
    }

    const row = item as Record<string, unknown>
    const rawText = typeof row.text === 'string' ? row.text : ''
    const text = sanitizeTweetText(rawText, allowHashtags)
    if (!text) throw new Error('Generated tweet text is empty')

    const rawHook = typeof row.hook === 'string' ? row.hook : ''
    const hook = sanitizeHook(rawHook, language)
    const hashtags = normalizeHashtags(row.hashtags, allowHashtags)

    return {
      text,
      hook,
      hashtags,
      char_count: text.length,
    }
  })
}

async function callClaude(
  trend: string,
  tweetVolume: number,
  pillar: string,
  language: OutputLanguage,
  allowHashtags: boolean
): Promise<TweetOption[]> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(language, allowHashtags),
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(trend, tweetVolume, pillar, language, allowHashtags),
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return parseJsonOptions(content.text, language, allowHashtags)
}

function isClaudeFallbackEligible(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()

  return (
    msg.includes('credit balance is too low') ||
    msg.includes('insufficient') ||
    msg.includes('billing') ||
    msg.includes('rate limit') ||
    msg.includes('overloaded')
  )
}

async function callOpenAI(
  trend: string,
  tweetVolume: number,
  pillar: string,
  language: OutputLanguage,
  allowHashtags: boolean
): Promise<TweetOption[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(language, allowHashtags) },
        { role: 'user', content: buildUserPrompt(trend, tweetVolume, pillar, language, allowHashtags) },
      ],
      max_tokens: 1024,
      temperature: 0.8,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  return parseJsonOptions(data.choices[0].message.content, language, allowHashtags)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      trend: string
      tweetVolume?: number
      pillar: string
      model: AIModel
    }
    const { trend, tweetVolume = 0, pillar, model } = body

    if (!trend?.trim() || !pillar?.trim()) {
      return NextResponse.json(
        { success: false, error: 'trend and pillar are required' },
        { status: 400 }
      )
    }

    if (model !== 'claude' && model !== 'openai') {
      return NextResponse.json(
        { success: false, error: 'model must be "claude" or "openai"' },
        { status: 400 }
      )
    }

    let usedModel: AIModel = model
    let fallbackReason: string | null = null
    let options: TweetOption[]
    const language = detectLanguage(trend)
    const allowHashtags = isHashtagExplicitlyRequested(trend)

    if (model === 'claude') {
      try {
        options = await callClaude(trend, tweetVolume, pillar, language, allowHashtags)
        addAITrace({
          provider: 'anthropic',
          operation: 'generate',
          model: 'claude-sonnet-4-6',
          ok: true,
          message: 'Content generation success',
          meta: { trend, pillar, requestedModel: model },
        })
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Claude unavailable'
        const requestId = extractRequestId(errMsg)
        const statusMatch = errMsg.match(/\b([45]\d{2})\b/)
        const status = statusMatch ? Number(statusMatch[1]) : null

        addAITrace({
          provider: 'anthropic',
          operation: 'generate',
          model: 'claude-sonnet-4-6',
          ok: false,
          status,
          requestId,
          message: errMsg.slice(0, 400),
          meta: { trend, pillar, requestedModel: model },
        })

        if (!isClaudeFallbackEligible(error)) throw error
        if (!process.env.OPENAI_API_KEY) throw error

        console.warn(
          `[ContentGenerator] Claude failed, falling back to OpenAI. reason="${errMsg.slice(0, 180)}"`
        )

        options = await callOpenAI(trend, tweetVolume, pillar, language, allowHashtags)
        usedModel = 'openai'
        fallbackReason = 'Claude unavailable (billing/rate limit). Used OpenAI fallback.'
        addAITrace({
          provider: 'openai',
          operation: 'generate-fallback',
          model: 'gpt-4o-mini',
          ok: true,
          message: 'Fallback generation success',
          meta: { trend, pillar, requestedModel: model },
        })
      }
    } else {
      options = await callOpenAI(trend, tweetVolume, pillar, language, allowHashtags)
      addAITrace({
        provider: 'openai',
        operation: 'generate',
        model: 'gpt-4o-mini',
        ok: true,
        message: 'Content generation success',
        meta: { trend, pillar, requestedModel: model },
      })
    }

    console.log(
      `[ContentGenerator] requestedModel=${model} usedModel=${usedModel} trend="${trend}" pillar="${pillar}" options=${options.length}`
    )

    return NextResponse.json({
      success: true,
      model: usedModel,
      requestedModel: model,
      fallbackReason,
      options,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ContentGenerator] Error:', error)
    addAITrace({
      provider: 'system',
      operation: 'generate-error',
      ok: false,
      requestId: extractRequestId(msg),
      message: msg.slice(0, 400),
    })
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
