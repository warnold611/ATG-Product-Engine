const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeOptions {
  search?: boolean
  tokens?: number
  system?: string
}

export async function callClaude(
  messages: Message[],
  { search = false, tokens = 2000, system }: ClaudeOptions = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: tokens,
    messages,
  }

  if (system) body.system = system

  if (search) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (data.error) {
    throw new Error(data.error.message || 'Claude API error')
  }

  return (data.content || [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
}

export function safeJSON<T>(raw: string): T | null {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  const candidates = [
    cleaned.match(/\[[\s\S]*\]/)?.[0],
    cleaned.match(/\{[\s\S]*\}/)?.[0],
    cleaned,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      return JSON.parse(candidate) as T
    } catch {}
  }
  return null
}

// Build system prompt from settings brand voice
export function buildSystemPrompt(settings: {
  brand_voice?: string | null
  atg_philosophy?: string | null
  trading_background?: string | null
}): string {
  const parts: string[] = [
    'You are writing content for Arnold Trading Group (ATG) — a professional trading education brand.',
  ]

  if (settings.atg_philosophy) {
    parts.push(`ATG Philosophy: ${settings.atg_philosophy}`)
  }

  if (settings.trading_background) {
    parts.push(`Trading Background Context: ${settings.trading_background}`)
  }

  if (settings.brand_voice) {
    parts.push(`Brand Voice: ${settings.brand_voice}`)
  } else {
    parts.push(
      'Brand Voice: Experienced trader talking to another trader. Direct, specific, no corporate speak, no academic fluff. Real examples, real numbers, real scenarios.'
    )
  }

  return parts.join('\n\n')
}
