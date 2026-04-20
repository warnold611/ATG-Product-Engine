import { NextRequest, NextResponse } from 'next/server'
import { callClaude, safeJSON, buildSystemPrompt } from '@/lib/claude'
import { getServiceClient } from '@/lib/supabase'

interface IdeaResult {
  id: number
  title: string
  subtitle: string
  targetAudience: string
  gap: string
  whyItSells: string
  price: string
  pages: string
  numChapters: number
  angle: string
}

export async function POST(req: NextRequest) {
  try {
    const { research } = await req.json()
    if (!research) return NextResponse.json({ error: 'research is required' }, { status: 400 })

    const db = getServiceClient()
    const { data: settings } = await db.from('settings').select('*').single()
    const system = buildSystemPrompt(settings || {})

    const nicheContext = settings?.niche_focus?.length
      ? `Focus especially on these niches: ${settings.niche_focus.join(', ')}.`
      : ''

    const priceContext = settings?.default_price_range
      ? `Default price range for ATG products: ${settings.default_price_range}.`
      : ''

    const raw = await callClaude(
      [
        {
          role: 'user',
          content: `Based on this live research of real trader pain points in 2025:

${research}

${nicheContext}
${priceContext}

Create exactly 6 highly marketable ebook ideas targeting these gaps. These must be SPECIFIC — not generic "learn to trade" books. Think: a trader would open their wallet for this.

Return ONLY a valid JSON array. No markdown, no explanation, no preamble:
[
  {
    "id": 1,
    "title": "Full ebook title",
    "subtitle": "Compelling subtitle",
    "targetAudience": "Specific, narrow audience description",
    "gap": "The exact pain point this solves (1-2 sentences, be specific)",
    "whyItSells": "Why this hits RIGHT NOW in 2025 (1 sentence)",
    "price": "$XX",
    "pages": "XX-XX pages",
    "numChapters": 6,
    "angle": "The unique hook that separates this from anything else"
  }
]`,
        },
      ],
      { search: false, tokens: 2500, system }
    )

    const parsed = safeJSON<IdeaResult[]>(raw)
    if (!parsed || !Array.isArray(parsed) || !parsed.length) {
      throw new Error('Could not parse ebook ideas — try again')
    }

    // Save all ideas to Supabase
    const rows = parsed.map((idea) => ({
      title: idea.title,
      subtitle: idea.subtitle,
      target_audience: idea.targetAudience,
      gap: idea.gap,
      angle: idea.angle,
      why_it_sells: idea.whyItSells,
      price_estimate: idea.price,
      page_range: idea.pages,
      num_chapters: idea.numChapters || 6,
      product_type: 'ebook' as const,
      status: 'new' as const,
      research_source: research.substring(0, 500),
    }))

    const { data: inserted, error } = await db.from('ideas').insert(rows).select()
    if (error) throw new Error(error.message)

    return NextResponse.json({ ideas: inserted })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
