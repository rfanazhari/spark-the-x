import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { addAITrace, extractRequestId } from '@/lib/ai-trace'
import { getAuthUser } from '@/lib/auth'

const SYSTEM_PROMPT = `You are a tweet ghostwriter for @rfanazhari, a tech educator and builder from Indonesia.

IDENTITY:
- Niche: Tech, AI, Programming, Technology for better life
- Audience: Young entrepreneurs (18-25), startup founders, working professionals in Indonesia
- Tone: Educational, informative, relatable — like a knowledgeable friend, not a lecturer
- Language: Mix of Bahasa Indonesia and English naturally
- Goal: Build authority as Indonesia's go-to tech educator, grow community, monetize via digital products and affiliate

CONTENT PILLARS:
1. Tips & Tutorial (practical, actionable)
2. Tech/AI trend opinions (unique perspective, bold takes)
3. Behind the scene (personal journey, lessons learned)

WRITING STYLE:
- Start with a strong hook
- Use concrete numbers and data when possible
- End with a CTA or question to spark engagement
- Mix Bahasa Indonesia + English naturally
- Hashtags: #AI #Tech #Programming #BuildInPublic #TechIndonesia

RULES:
- Max 280 characters per tweet
- Never sound like a corporate brand
- Always add unique perspective, not just restate the trend
- Sound like a real human, not a bot`

interface TweetOption {
  text: string
  hook: string
  hashtags: string[]
  char_count: number
}

type AIModel = 'claude' | 'openai'

function buildUserPrompt(trend: string, tweetVolume: number, pillar: string): string {
  const volumeStr = tweetVolume > 0 ? ` (${tweetVolume.toLocaleString()} tweets)` : ''
  return `Generate 3 tweet options about the trending topic: ${trend}${volumeStr}.
Content Pillar: ${pillar}

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation, no code fences. Format:
[{"text":"tweet content here","hook":"why this hook works","hashtags":["#Tag1","#Tag2"],"char_count":120}]

Rules:
- Each tweet text must be max 280 characters
- char_count must equal the exact character count of the text field
- Include 1-3 relevant hashtags per tweet
- Adapt tone and format to the specified content pillar`
}

function parseJsonOptions(raw: string): TweetOption[] {
  const stripped = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const options = JSON.parse(stripped) as TweetOption[]
  return options.map((opt) => ({ ...opt, char_count: opt.text.length }))
}

async function callClaude(trend: string, tweetVolume: number, pillar: string): Promise<TweetOption[]> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(trend, tweetVolume, pillar) }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return parseJsonOptions(content.text)
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

async function callOpenAI(trend: string, tweetVolume: number, pillar: string): Promise<TweetOption[]> {
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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(trend, tweetVolume, pillar) },
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
  return parseJsonOptions(data.choices[0].message.content)
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

    if (model === 'claude') {
      try {
        options = await callClaude(trend, tweetVolume, pillar)
        addAITrace({
          provider: 'anthropic',
          operation: 'generate',
          model: 'claude-sonnet-4-20250514',
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
          model: 'claude-sonnet-4-20250514',
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

        options = await callOpenAI(trend, tweetVolume, pillar)
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
      options = await callOpenAI(trend, tweetVolume, pillar)
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
