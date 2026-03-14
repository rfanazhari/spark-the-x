import { NextRequest, NextResponse } from 'next/server'
import { getAITraces } from '@/lib/ai-trace'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('requestId') ?? undefined
  const providerParam = searchParams.get('provider')
  const limitParam = Number(searchParams.get('limit') ?? '50')

  const provider =
    providerParam === 'anthropic' || providerParam === 'openai' || providerParam === 'system'
      ? providerParam
      : undefined

  const traces = getAITraces({
    requestId,
    provider,
    limit: Number.isFinite(limitParam) ? limitParam : 50,
  })

  return NextResponse.json(
    {
      success: true,
      generatedAt: new Date().toISOString(),
      filters: {
        requestId: requestId ?? null,
        provider: provider ?? null,
        limit: Number.isFinite(limitParam) ? limitParam : 50,
      },
      total: traces.length,
      traces,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
