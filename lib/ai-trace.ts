export type AITraceEvent = {
  id: string
  ts: string
  provider: 'anthropic' | 'openai' | 'system'
  operation: string
  model?: string
  status?: number | null
  ok: boolean
  requestId?: string | null
  message?: string
  meta?: Record<string, unknown>
}

const MAX_TRACE_EVENTS = 300

declare global {
  // eslint-disable-next-line no-var
  var __AI_TRACE_EVENTS__: AITraceEvent[] | undefined
}

function getStore(): AITraceEvent[] {
  if (!globalThis.__AI_TRACE_EVENTS__) {
    globalThis.__AI_TRACE_EVENTS__ = []
  }

  return globalThis.__AI_TRACE_EVENTS__
}

export function addAITrace(event: Omit<AITraceEvent, 'id' | 'ts'>): AITraceEvent {
  const trace: AITraceEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    ...event,
  }

  const store = getStore()
  store.unshift(trace)
  if (store.length > MAX_TRACE_EVENTS) store.length = MAX_TRACE_EVENTS
  return trace
}

export function getAITraces(params?: {
  requestId?: string
  provider?: AITraceEvent['provider']
  limit?: number
}): AITraceEvent[] {
  const limit = Math.max(1, Math.min(params?.limit ?? 50, 200))
  const requestId = params?.requestId?.trim()
  const provider = params?.provider

  return getStore()
    .filter((item) => {
      if (requestId && item.requestId !== requestId) return false
      if (provider && item.provider !== provider) return false
      return true
    })
    .slice(0, limit)
}

export function extractRequestId(input: string): string | null {
  const match = input.match(/\breq_[A-Za-z0-9]+\b/)
  return match?.[0] ?? null
}
