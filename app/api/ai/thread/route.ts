import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are a tweet ghostwriter for @rfanazhari, a tech educator and builder from Indonesia.

IDENTITY:
- Niche: Tech, AI, Programming, Technology for better life
- Audience: Young entrepreneurs (18-25), startup founders, working professionals in Indonesia
- Tone: Educational, informative, relatable — like a knowledgeable friend, not a lecturer
- Language: Mix of Bahasa Indonesia and English naturally
- Goal: Build authority as Indonesia's go-to tech educator

RULES:
- Max 280 characters per tweet (count carefully)
- Never sound like a corporate brand
- Sound like a real human, not a bot
- Mix Bahasa Indonesia + English naturally`

interface TweetItem {
  index: number
  text: string
  type: 'hook' | 'body' | 'cta'
  charCount: number
}

type ThreadModel = 'claude' | 'openai'

interface ThreadRequestBody {
  topic: string
  model: ThreadModel
  tweetVolume?: number
  fromTrend?: boolean
}

interface OpenAIResponse {
  choices: { message: { content: string } }[]
}

function buildThreadPrompt(topic: string, tweetVolume?: number, fromTrend?: boolean): string {
  const trendNote = fromTrend && tweetVolume
    ? `This topic is currently trending with ${tweetVolume.toLocaleString()} tweets.`
    : ''

  return `Create a Twitter thread about: "${topic}"
${trendNote}

FORMAT RULES:
- Tweet 1 (hook): strong opening that hooks readers, NO numbering, ALWAYS end with 🧵 emoji
- Tweet 2..N-1 (body): each tweet = one clear point, start with "(X)" where X is the tweet number
  example: "(2) " for the second body tweet
- No total count in numbering — just the index
- Tweet N (cta): engaging call-to-action + 1-3 relevant hashtags, NO numbering
- Every tweet MUST be max 280 characters — count carefully including numbering and 🧵
- Determine tweet count based on content depth (min 3, max 15)
- Language: mix Bahasa Indonesia + English naturally
- Tone: educational, relatable, like a knowledgeable friend

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

function recalculateNumbering(tweets: TweetItem[]): TweetItem[] {
  return tweets.map((tweet, i) => {
    if (tweet.type !== 'body') {
      return { ...tweet, charCount: tweet.text.length }
    }

    const cleanText = tweet.text
      .replace(/^\(\d+\)\s*/, '')
      .replace(/\s*\(\d+\/\d+\)\s*$/, '')
      .trim()
    const numbered = `(${i + 1}) ${cleanText}`
    const useNumbered = numbered.length <= 280

    return {
      ...tweet,
      text: useNumbered ? numbered : cleanText,
      charCount: useNumbered ? numbered.length : cleanText.length,
    }
  })
}

async function generateWithClaude(
  topic: string,
  tweetVolume?: number,
  fromTrend?: boolean
): Promise<TweetItem[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildThreadPrompt(topic, tweetVolume, fromTrend) }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const stripped = content.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const parsed = JSON.parse(stripped) as { tweets: TweetItem[] }
  return parsed.tweets
}

async function generateWithOpenAI(
  topic: string,
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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildThreadPrompt(topic, tweetVolume, fromTrend) },
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
  const stripped = data.choices[0].message.content.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const parsed = JSON.parse(stripped) as { tweets: TweetItem[] }
  return parsed.tweets
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

    let rawTweets: TweetItem[]
    if (model === 'claude') {
      rawTweets = await generateWithClaude(topic, tweetVolume, fromTrend)
    } else {
      rawTweets = await generateWithOpenAI(topic, tweetVolume, fromTrend)
    }

    const tweets = recalculateNumbering(rawTweets)

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
