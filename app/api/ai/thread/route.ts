import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

interface TweetItem {
  index: number
  text: string
  type: 'hook' | 'body' | 'cta'
  charCount: number
}

type ThreadModel = 'claude' | 'openai'
type OutputLanguage = 'Indonesian' | 'English'

interface ThreadRequestBody {
  topic: string
  model: ThreadModel
  tweetVolume?: number
  fromTrend?: boolean
}

interface OpenAIResponse {
  choices: { message: { content: string } }[]
}

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

function sanitizeThreadText(text: string, allowHashtags: boolean): string {
  let sanitized = text.trim()
  sanitized = sanitized.replace(/^(?:\(\d+\)|\[\d+\]|\d+\/\d+|\d+[).:-])\s*/g, '')
  sanitized = sanitized.replace(/[\u2013\u2014]/g, '-')
  sanitized = sanitized.replace(/[!]+/g, '')
  sanitized = sanitized.replace(/\p{Extended_Pictographic}/gu, '')

  ENGAGEMENT_BAIT_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '')
  })
  MOTIVATIONAL_PATTERNS.forEach((pattern) => {
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

function buildSystemPrompt(language: OutputLanguage, allowHashtags: boolean): string {
  const languageRule =
    language === 'Indonesian'
      ? 'Write fully in Indonesian. Do not mix with English.'
      : 'Write fully in English. Do not mix with Indonesian.'

  const hashtagRule = allowHashtags
    ? 'Hashtags are allowed only because they were explicitly requested. Keep them minimal.'
    : 'Do not use hashtags.'

  return `You are a social media ghostwriter for a tech/AI founder on X.

VOICE:
- Gen Z, lowercase, dry, confident
- Opinionated but not arrogant
- Sounds like a founder who has seen real product cycles

HARD RULES:
- No emojis
- No exclamation marks
- No motivational closings
- No generic engagement bait
- Avoid em dashes
- Keep it short and blunt
- One idea per tweet
- Hook must challenge or provoke with no preamble
- End with a statement that invites debate, never a question
- ${languageRule}
- ${hashtagRule}`
}

function buildThreadPrompt(
  topic: string,
  language: OutputLanguage,
  allowHashtags: boolean,
  tweetVolume?: number,
  fromTrend?: boolean
): string {
  const trendNote = fromTrend && tweetVolume
    ? `This topic is currently trending with ${tweetVolume.toLocaleString()} tweets.`
    : ''

  return `Create a Twitter thread about: "${topic}"
${trendNote}
Language: ${language}

FORMAT RULES:
- Return 3 to 5 tweets only
- No numbering format like 1/, 2/, (1), or "tweet 1"
- Each tweet should stand on its own and carry one sharp point
- Tweet 1 type must be "hook"
- Tweet 2..N-1 type must be "body"
- Last tweet type must be "cta"
- Every tweet MUST be max 280 characters
- ${allowHashtags ? 'Hashtags allowed only if needed, max 3 total in the full thread.' : 'Do not use hashtags.'}

Respond ONLY in valid JSON, no markdown, no explanation:
{
  "tweets": [
    { "index": 0, "text": "...", "type": "hook", "charCount": 120 },
    { "index": 1, "text": "...", "type": "body", "charCount": 245 },
    { "index": 2, "text": "...", "type": "cta", "charCount": 180 }
  ],
  "totalTweets": 3
}`
}

function parseThreadResponse(raw: string, allowHashtags: boolean): TweetItem[] {
  const stripped = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const parsed = JSON.parse(stripped) as { tweets?: Array<Partial<TweetItem>> }

  if (!parsed.tweets || !Array.isArray(parsed.tweets)) {
    throw new Error('AI response must include a tweets array')
  }

  if (parsed.tweets.length < 3) {
    throw new Error('Thread must contain at least 3 tweets')
  }

  const limitedTweets = parsed.tweets.slice(0, 5)

  return limitedTweets.map((tweet, i) => {
    const text = sanitizeThreadText(typeof tweet.text === 'string' ? tweet.text : '', allowHashtags)
    if (!text) {
      throw new Error(`Tweet ${i + 1} is empty after normalization`)
    }

    const type: TweetItem['type'] =
      i === 0 ? 'hook' : i === limitedTweets.length - 1 ? 'cta' : 'body'

    return {
      index: i,
      text,
      type,
      charCount: text.length,
    }
  })
}

async function generateWithClaude(
  topic: string,
  language: OutputLanguage,
  allowHashtags: boolean,
  tweetVolume?: number,
  fromTrend?: boolean
): Promise<TweetItem[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: buildSystemPrompt(language, allowHashtags),
    messages: [
      {
        role: 'user',
        content: buildThreadPrompt(topic, language, allowHashtags, tweetVolume, fromTrend),
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return parseThreadResponse(content.text, allowHashtags)
}

async function generateWithOpenAI(
  topic: string,
  language: OutputLanguage,
  allowHashtags: boolean,
  tweetVolume?: number,
  fromTrend?: boolean
): Promise<TweetItem[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(language, allowHashtags) },
        {
          role: 'user',
          content: buildThreadPrompt(topic, language, allowHashtags, tweetVolume, fromTrend),
        },
      ],
      max_tokens: 2048,
      temperature: 0.8,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as OpenAIResponse
  return parseThreadResponse(data.choices[0].message.content, allowHashtags)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const month = new Date().toISOString().slice(0, 7)

    const { data: usage } = await supabase
      .from('thread_usage')
      .select('thread_count, limit_count')
      .eq('user_id', user.id)
      .eq('month', month)
      .maybeSingle()

    const threadCount = usage?.thread_count ?? 0
    const limitCount = usage?.limit_count ?? 5

    if (threadCount >= limitCount) {
      return NextResponse.json(
        { success: false, error: 'Monthly thread limit reached. Upgrade to post more threads.' },
        { status: 429 }
      )
    }

    const { topic, model, tweetVolume, fromTrend } = (await request.json()) as ThreadRequestBody

    if (!topic?.trim()) {
      return NextResponse.json({ success: false, error: 'Topic is required' }, { status: 400 })
    }

    if (model !== 'claude' && model !== 'openai') {
      return NextResponse.json(
        { success: false, error: 'Model must be "claude" or "openai"' },
        { status: 400 }
      )
    }

    const language = detectLanguage(topic)
    const allowHashtags = isHashtagExplicitlyRequested(topic)

    let rawTweets: TweetItem[]
    if (model === 'claude') {
      rawTweets = await generateWithClaude(topic, language, allowHashtags, tweetVolume, fromTrend)
    } else {
      rawTweets = await generateWithOpenAI(topic, language, allowHashtags, tweetVolume, fromTrend)
    }

    const tweets = rawTweets

    const invalid = tweets.filter((t) => t.text.length > 280)
    if (invalid.length > 0) {
      throw new Error(`${invalid.length} tweet(s) exceed 280 characters after generation`)
    }

    await supabase.from('thread_usage').upsert(
      {
        user_id: user.id,
        month,
        thread_count: threadCount + 1,
        limit_count: limitCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,month' }
    )

    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert({
        user_id: user.id,
        topic,
        model,
        total_tweets: tweets.length,
        status: 'draft',
      })
      .select('id')
      .single()

    if (threadError || !thread) throw new Error('Failed to save thread')

    await supabase.from('thread_tweets').insert(
      tweets.map((t) => ({
        thread_id: thread.id,
        user_id: user.id,
        index: t.index,
        type: t.type,
        text: t.text,
        char_count: t.text.length,
        status: 'pending',
      }))
    )

    console.log(`[Thread Generate] user=${user.id} model=${model} tweets=${tweets.length}`)

    return NextResponse.json({
      success: true,
      threadId: thread.id,
      model,
      topic,
      tweets,
      totalTweets: tweets.length,
      usage: {
        threadCount: threadCount + 1,
        limitCount,
        remaining: Math.max(0, limitCount - threadCount - 1),
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Thread Generate]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
