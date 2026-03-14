import { NextResponse } from 'next/server'
import { addAITrace } from '@/lib/ai-trace'

type AnthropicModel = {
  id: string
  type?: string
  display_name?: string
  created_at?: string
}

function maskKey(raw: string | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null
  if (value.length <= 10) return `${value.slice(0, 4)}...`
  return `${value.slice(0, 10)}...${value.slice(-4)}`
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'ANTHROPIC_API_KEY not configured',
      },
      { status: 500 }
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    const requestId = res.headers.get('request-id') ?? res.headers.get('x-request-id')
    const payload = (await res.json()) as { data?: AnthropicModel[]; error?: { message?: string } }

    if (!res.ok) {
      const message = payload?.error?.message ?? `Anthropic error ${res.status}`
      addAITrace({
        provider: 'anthropic',
        operation: 'models-list',
        ok: false,
        status: res.status,
        requestId,
        message,
      })
      return NextResponse.json(
        {
          success: false,
          status: res.status,
          requestId,
          error: message,
          keyHint: maskKey(apiKey),
        },
        { status: res.status }
      )
    }

    const models = (payload.data ?? []).map((m) => ({
      id: m.id,
      displayName: m.display_name ?? null,
      createdAt: m.created_at ?? null,
      type: m.type ?? null,
    }))

    addAITrace({
      provider: 'anthropic',
      operation: 'models-list',
      ok: true,
      status: res.status,
      requestId,
      message: `Fetched ${models.length} models`,
    })

    return NextResponse.json(
      {
        success: true,
        generatedAt: new Date().toISOString(),
        keyHint: maskKey(apiKey),
        requestId,
        total: models.length,
        models,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    addAITrace({
      provider: 'anthropic',
      operation: 'models-list',
      ok: false,
      message,
    })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    clearTimeout(timeout)
  }
}
