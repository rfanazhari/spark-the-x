import { NextRequest, NextResponse } from 'next/server'
import { addAITrace } from '@/lib/ai-trace'

type ProviderCheckResult = {
  configured: boolean
  keyHint: string | null
  ok: boolean
  status: number | null
  message: string
  requestId?: string | null
}

type ModelProbeResult = {
  attempted: boolean
  model: string
  ok: boolean
  status: number | null
  message: string
  requestId?: string | null
}

function maskKey(raw: string | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null

  if (value.length <= 10) return `${value.slice(0, 4)}...`
  return `${value.slice(0, 10)}...${value.slice(-4)}`
}

function sanitizeMessage(message: string, secrets: Array<string | undefined>): string {
  let sanitized = message
  for (const raw of secrets) {
    const secret = raw?.trim()
    if (!secret) continue
    sanitized = sanitized.split(secret).join('[redacted]')
  }

  return sanitized
}

function normalizeErrorMessage(input: unknown, secrets: Array<string | undefined> = []): string {
  if (typeof input === 'string' && input.trim()) return sanitizeMessage(input.trim(), secrets)
  if (input && typeof input === 'object' && 'message' in input) {
    const maybeMessage = (input as { message?: unknown }).message
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return sanitizeMessage(maybeMessage.trim(), secrets)
    }
  }

  return 'Unknown provider error'
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function checkAnthropic(apiKey: string | undefined): Promise<ProviderCheckResult> {
  const configured = Boolean(apiKey?.trim())
  if (!configured) {
    return {
      configured: false,
      keyHint: null,
      ok: false,
      status: null,
      message: 'ANTHROPIC_API_KEY not configured',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey!.trim(),
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    const payload = await safeJson(response)
    if (response.ok) {
      return {
        configured: true,
        keyHint: maskKey(apiKey),
        ok: true,
        status: response.status,
        message: 'Anthropic API reachable',
        requestId:
          response.headers.get('request-id') ??
          response.headers.get('x-request-id') ??
          null,
      }
    }

    const errPayload = payload as { error?: unknown; request_id?: string }
    const message = errPayload?.error
      ? normalizeErrorMessage(errPayload.error, [apiKey])
      : normalizeErrorMessage(payload, [apiKey])

    return {
      configured: true,
      keyHint: maskKey(apiKey),
      ok: false,
      status: response.status,
      message,
      requestId:
        errPayload?.request_id ??
        response.headers.get('request-id') ??
        response.headers.get('x-request-id'),
    }
  } catch (error: unknown) {
    return {
      configured: true,
      keyHint: maskKey(apiKey),
      ok: false,
      status: null,
      message: normalizeErrorMessage(error, [apiKey]),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function checkOpenAI(apiKey: string | undefined): Promise<ProviderCheckResult> {
  const configured = Boolean(apiKey?.trim())
  if (!configured) {
    return {
      configured: false,
      keyHint: null,
      ok: false,
      status: null,
      message: 'OPENAI_API_KEY not configured',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey!.trim()}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    const payload = await safeJson(response)
    if (response.ok) {
      return {
        configured: true,
        keyHint: maskKey(apiKey),
        ok: true,
        status: response.status,
        message: 'OpenAI API reachable',
        requestId: response.headers.get('x-request-id'),
      }
    }

    const errPayload = payload as { error?: unknown }
    const message = errPayload?.error
      ? normalizeErrorMessage(errPayload.error, [apiKey])
      : normalizeErrorMessage(payload, [apiKey])

    return {
      configured: true,
      keyHint: maskKey(apiKey),
      ok: false,
      status: response.status,
      message,
      requestId: response.headers.get('x-request-id'),
    }
  } catch (error: unknown) {
    return {
      configured: true,
      keyHint: maskKey(apiKey),
      ok: false,
      status: null,
      message: normalizeErrorMessage(error, [apiKey]),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function probeAnthropicModel(
  apiKey: string | undefined,
  model: string
): Promise<ModelProbeResult> {
  if (!apiKey?.trim()) {
    return {
      attempted: false,
      model,
      ok: false,
      status: null,
      message: 'ANTHROPIC_API_KEY not configured',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with OK' }],
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const payload = await safeJson(response)
    if (response.ok) {
      return {
        attempted: true,
        model,
        ok: true,
        status: response.status,
        message: 'Anthropic model generation probe passed',
        requestId:
          response.headers.get('request-id') ??
          response.headers.get('x-request-id') ??
          null,
      }
    }

    const errPayload = payload as { error?: unknown; request_id?: string }
    const message = errPayload?.error
      ? normalizeErrorMessage(errPayload.error, [apiKey])
      : normalizeErrorMessage(payload, [apiKey])

    return {
      attempted: true,
      model,
      ok: false,
      status: response.status,
      message,
      requestId:
        errPayload?.request_id ??
        response.headers.get('request-id') ??
        response.headers.get('x-request-id'),
    }
  } catch (error: unknown) {
    return {
      attempted: true,
      model,
      ok: false,
      status: null,
      message: normalizeErrorMessage(error, [apiKey]),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const probe = searchParams.get('probe') !== 'false'
  const modelProbe = searchParams.get('modelProbe') !== 'false'
  const anthropicModel = searchParams.get('anthropicModel') ?? 'claude-sonnet-4-20250514'

  if (!probe) {
    return NextResponse.json(
      {
        success: true,
        generatedAt: new Date().toISOString(),
        probe,
        providers: {
          anthropic: {
            configured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
            keyHint: maskKey(process.env.ANTHROPIC_API_KEY),
          },
          openai: {
            configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
            keyHint: maskKey(process.env.OPENAI_API_KEY),
          },
        },
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  const [anthropic, openai] = await Promise.all([
    checkAnthropic(process.env.ANTHROPIC_API_KEY),
    checkOpenAI(process.env.OPENAI_API_KEY),
  ])

  addAITrace({
    provider: 'anthropic',
    operation: 'health-probe',
    ok: anthropic.ok,
    status: anthropic.status,
    requestId: anthropic.requestId ?? null,
    message: anthropic.message,
    meta: { configured: anthropic.configured },
  })
  addAITrace({
    provider: 'openai',
    operation: 'health-probe',
    ok: openai.ok,
    status: openai.status,
    requestId: openai.requestId ?? null,
    message: openai.message,
    meta: { configured: openai.configured },
  })

  const anthropicModelProbe = modelProbe
    ? await probeAnthropicModel(process.env.ANTHROPIC_API_KEY, anthropicModel)
    : ({
        attempted: false,
        model: anthropicModel,
        ok: false,
        status: null,
        message: 'Skipped (modelProbe=false)',
      } as ModelProbeResult)

  addAITrace({
    provider: 'anthropic',
    operation: 'model-probe',
    model: anthropicModelProbe.model,
    ok: anthropicModelProbe.ok,
    status: anthropicModelProbe.status,
    requestId: anthropicModelProbe.requestId ?? null,
    message: anthropicModelProbe.message,
    meta: { attempted: anthropicModelProbe.attempted },
  })

  const overallOk =
    (anthropic.configured && anthropic.ok) ||
    (openai.configured && openai.ok) ||
    anthropicModelProbe.ok

  return NextResponse.json(
    {
      success: true,
      generatedAt: new Date().toISOString(),
      probe,
      modelProbe,
      overallOk,
      providers: {
        anthropic,
        openai,
      },
      modelChecks: {
        anthropic: anthropicModelProbe,
      },
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
