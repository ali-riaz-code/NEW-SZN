// OpenAI integration — single low-level chat helper used by every AI feature.
// See docs/ai-features.md. Env vars: OPENAI_API_KEY, optional OPENAI_MODEL.
//
// All AI features (Insights, Loss Debrief, Anomaly narrative, Next Best Action,
// Daily Targets, Campaign Narratives) route through chatComplete(). Callers own
// their own prompts and output channels — this file only talks to the API.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

// Low-level chat completion. Returns the assistant's text, or throws on API error.
export async function chatComplete(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured')

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 600,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned an empty completion')
  return text
}

// Ask for a JSON array of short strings (used by Insights and Next Best Action).
// Falls back to line-splitting if the model doesn't return clean JSON.
export async function chatCompleteList(
  system: string,
  user: string,
  opts: ChatOptions = {},
): Promise<string[]> {
  const raw = await chatComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    opts,
  )

  // Try to extract a JSON array first.
  const match = raw.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x)).filter((s) => s.trim().length > 0)
      }
    } catch {
      // fall through to line splitting
    }
  }

  return raw
    .split('\n')
    .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter((l) => l.length > 0)
}
