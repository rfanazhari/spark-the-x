import fs from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { addAITrace, extractRequestId } from '@/lib/ai-trace'
import { getAuthUser } from '@/lib/auth'
import type {
  GenerateReplyRequest,
  GenerateReplyResponse,
  ReplyOption,
} from '@/app/dashboard/reply-hunter/types'

const TONE_WHITELIST = ['educational', 'bold', 'curious'] as const
const BANNED_TERMS = ['guaranteed profit', 'dm me now', 'click link', 'pump and dump', 'free money']

type ReplyTone = (typeof TONE_WHITELIST)[number]
type ProviderModel = 'claude' | 'openai'

const FALLBACK_IDENTITY = `- Niche: Tech, AI, Programming, Digital products\n- Audience: Indonesian tech audience\n- Voice: Helpful, practical, and human\n- Goal: Share insight and spark meaningful discussion`

function isValidTone(tone: string): tone is ReplyTone {
  return TONE_WHITELIST.includes(tone as ReplyTone)
}

function isIndonesian(text: string): boolean {
  const commonWords = ['yang', 'dan', 'di', 'ke', 'nya', 'aku', 'kamu', 'untuk', 'dengan', 'ini', 'itu', 'adalah']
  const normalized = ` ${text.toLowerCase()} `
  const matches = commonWords.reduce((total, word) => {
    return normalized.includes(` ${word} `) ? total + 1 : total
  }, 0)
  return matches >= 2
}

function isValidProviderModel(model: unknown): model is ProviderModel {
  return model === 'claude' || model === 'openai'
}

function buildSystemPrompt(identityContext: string, tone: ReplyTone, tweetLanguage: string): string {
  return `You are a reply ghostwriter for @rfanazhari, a tech educator from Indonesia.

IDENTITY CONTEXT:
${identityContext}

TONE REQUESTED: ${tone}
- educational: add value, share knowledge, cite data if relevant
- bold: confident hot take, disagree respectfully if needed
- curious: ask an insightful question that sparks discussion

IMPORTANT: The original tweet is in ${tweetLanguage}.
You MUST reply in ${tweetLanguage} only. Do not mix languages.`
}

function buildUserPrompt(authorHandle: string, tweetText: string, tone: ReplyTone): string {
  return `TWEET TO REPLY:
@${authorHandle}: ${tweetText}

Generate exactly 3 reply options. Each must be under 280 characters.

Return ONLY valid JSON, no markdown, no preamble:
[
  { "text": "reply option 1", "tone": "${tone}" },
  { "text": "reply option 2", "tone": "${tone}" },
  { "text": "reply option 3", "tone": "${tone}" }
]`
}

function parseStrictReplyJson(raw: string): { text: string; tone: ReplyTone }[] {
  const stripped = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const parsed = JSON.parse(stripped) as unknown

  if (!Array.isArray(parsed) || parsed.length !== 3) {
    throw new Error('AI response must be a JSON array with exactly 3 options')
  }

  return parsed.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('AI response item must be an object')
    }

    const row = item as Record<string, unknown>
    const text = typeof row.text === 'string' ? row.text.trim() : ''
    const tone = typeof row.tone === 'string' ? row.tone : ''

    if (!text) throw new Error('AI response text is empty')
    if (!isValidTone(tone)) throw new Error('AI response tone invalid')

    return { text, tone }
  })
}

function hasBannedTerm(text: string): boolean {
  const lower = text.toLowerCase()
  return BANNED_TERMS.some((term) => lower.includes(term))
}

function normalizeOptions(items: { text: string; tone: ReplyTone }[]): ReplyOption[] {
  return items
    .filter((item) => item.text.length <= 280)
    .filter((item) => !hasBannedTerm(item.text))
    .map((item) => ({
      text: item.text,
      tone: item.tone,
      charCount: item.text.length,
    }))
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 900,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 900,
      temperature: 0.8,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty content')
  return content
}

function loadIdentityContext(): { content: string; fromFile: boolean } {
  try {
    const identityPath = path.join(process.cwd(), 'docs', 'IDENTITY.md')
    const content = fs.readFileSync(identityPath, 'utf-8').trim()
    if (!content) throw new Error('IDENTITY.md is empty')
    return { content, fromFile: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read IDENTITY.md'
    addAITrace({
      provider: 'system',
      operation: 'reply-generate-identity-fallback',
      ok: false,
      message: message.slice(0, 300),
    })
    return { content: FALLBACK_IDENTITY, fromFile: false }
  }
}

async function generateWithParseRetry(provider: 'anthropic' | 'openai', system: string, user: string) {
  const invoke = provider === 'anthropic' ? callClaude : callOpenAI
  let lastError: unknown = null

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const raw = await invoke(system, user)
      const parsed = parseStrictReplyJson(raw)
      const options = normalizeOptions(parsed)
      if (options.length === 0) {
        throw new Error('All generated replies are invalid (>280 chars or banned terms).')
      }
      return options
    } catch (error: unknown) {
      lastError = error
      if (attempt === 2) throw error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown generation error')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as GenerateReplyRequest
    const tone = body.tone
    const requestedModel: ProviderModel = isValidProviderModel(body.model) ? body.model : 'claude'
    const tweetText = body.tweetText?.trim()
    const authorHandle = body.authorHandle?.trim()

    if (!isValidTone(tone)) {
      return NextResponse.json(
        { success: false, error: 'tone must be one of: educational, bold, curious' },
        { status: 400 }
      )
    }

    if (!tweetText) {
      return NextResponse.json(
        { success: false, error: 'tweetText is required and cannot be empty' },
        { status: 400 }
      )
    }

    const tweetLanguage = isIndonesian(tweetText) ? 'Bahasa Indonesia' : 'English'
    const identity = loadIdentityContext()
    const systemPrompt = buildSystemPrompt(identity.content, tone, tweetLanguage)
    const userPrompt = buildUserPrompt(authorHandle || 'unknown', tweetText, tone)

    let data: ReplyOption[]
    let usedModel = requestedModel === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-6'
    let fallbackReason: string | undefined

    if (requestedModel === 'openai') {
      try {
        data = await generateWithParseRetry('openai', systemPrompt, userPrompt)
        addAITrace({
          provider: 'openai',
          operation: 'reply-generate',
          model: 'gpt-4o-mini',
          ok: true,
          message: 'OpenAI direct generation success',
          meta: {
            userId: user.id,
            tweetId: body.tweetId,
            tone,
            fromIdentityFile: identity.fromFile,
          },
        })
      } catch (openAiError: unknown) {
        const openAiMsg = openAiError instanceof Error ? openAiError.message : 'OpenAI failed'
        addAITrace({
          provider: 'openai',
          operation: 'reply-generate',
          model: 'gpt-4o-mini',
          ok: false,
          requestId: extractRequestId(openAiMsg),
          message: openAiMsg.slice(0, 400),
          meta: {
            userId: user.id,
            tweetId: body.tweetId,
            tone,
          },
        })

        addAITrace({
          provider: 'system',
          operation: 'reply-generate-failed',
          ok: false,
          message: `OpenAI direct generation failed: ${openAiMsg.slice(0, 280)}`,
          meta: {
            userId: user.id,
            tweetId: body.tweetId,
            tone,
            requestedModel,
          },
        })

        return NextResponse.json(
          { success: false, error: 'OpenAI generation failed.' },
          { status: 502 }
        )
      }
    } else {
      try {
        data = await generateWithParseRetry('anthropic', systemPrompt, userPrompt)
        addAITrace({
          provider: 'anthropic',
          operation: 'reply-generate',
          model: 'claude-sonnet-4-6',
          ok: true,
          message: 'Reply generation success',
          meta: {
            userId: user.id,
            tweetId: body.tweetId,
            tone,
            fromIdentityFile: identity.fromFile,
          },
        })
      } catch (claudeError: unknown) {
        const claudeMsg = claudeError instanceof Error ? claudeError.message : 'Claude failed'
        addAITrace({
          provider: 'anthropic',
          operation: 'reply-generate',
          model: 'claude-sonnet-4-6',
          ok: false,
          requestId: extractRequestId(claudeMsg),
          message: claudeMsg.slice(0, 400),
          meta: {
            userId: user.id,
            tweetId: body.tweetId,
            tone,
          },
        })

        try {
          data = await generateWithParseRetry('openai', systemPrompt, userPrompt)
          usedModel = 'gpt-4o-mini'
          fallbackReason = `Claude failed: ${claudeMsg.slice(0, 160)}`
          addAITrace({
            provider: 'openai',
            operation: 'reply-generate-fallback',
            model: 'gpt-4o-mini',
            ok: true,
            message: 'OpenAI fallback success',
            meta: {
              userId: user.id,
              tweetId: body.tweetId,
              tone,
            },
          })
        } catch (openAiError: unknown) {
          const openAiMsg = openAiError instanceof Error ? openAiError.message : 'OpenAI failed'
          addAITrace({
            provider: 'openai',
            operation: 'reply-generate-fallback',
            model: 'gpt-4o-mini',
            ok: false,
            requestId: extractRequestId(openAiMsg),
            message: openAiMsg.slice(0, 400),
            meta: {
              userId: user.id,
              tweetId: body.tweetId,
              tone,
            },
          })

          addAITrace({
            provider: 'system',
            operation: 'reply-generate-failed',
            ok: false,
            message: `Claude and OpenAI failed. Claude: ${claudeMsg.slice(0, 140)} | OpenAI: ${openAiMsg.slice(0, 140)}`,
            meta: {
              userId: user.id,
              tweetId: body.tweetId,
              tone,
              requestedModel,
            },
          })

          return NextResponse.json(
            { success: false, error: 'AI generation failed from all providers.' },
            { status: 502 }
          )
        }
      }
    }

    const response: GenerateReplyResponse = {
      success: true,
      data,
      model: usedModel,
      fallbackReason,
    }

    console.log(
      `[ReplyHunterGenerate] user=${user.id} tweet=${body.tweetId} tone=${tone} model=${usedModel} requested=${requestedModel}`
    )

    return NextResponse.json(response)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ReplyHunterGenerate] Error:', error)
    addAITrace({
      provider: 'system',
      operation: 'reply-generate-error',
      ok: false,
      requestId: extractRequestId(msg),
      message: msg.slice(0, 400),
    })
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
