import { NextRequest, NextResponse } from 'next/server'
import { callClaude, safeJSON, buildSystemPrompt } from '@/lib/claude'
import { getServiceClient } from '@/lib/supabase'

interface OutlineChapter {
  number: number
  title: string
  tagline: string
  sections: string[]
  keyTakeaway: string
}

interface OutlineResult {
  bookIntro: string
  chapters: OutlineChapter[]
}

export async function POST(req: NextRequest) {
  try {
    const { idea_id } = await req.json()
    if (!idea_id) return NextResponse.json({ error: 'idea_id required' }, { status: 400 })

    const db = getServiceClient()

    const { data: idea, error: ideaErr } = await db.from('ideas').select('*').eq('id', idea_id).single()
    if (ideaErr || !idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    const { data: settings } = await db.from('settings').select('*').single()
    const system = buildSystemPrompt(settings || {})

    const raw = await callClaude(
      [
        {
          role: 'user',
          content: `Build a tight chapter outline for this trading ebook:

TITLE: ${idea.title}
SUBTITLE: ${idea.subtitle || ''}
AUDIENCE: ${idea.target_audience || ''}
UNIQUE ANGLE: ${idea.angle || ''}
CORE GAP SOLVED: ${idea.gap || ''}

Create ${idea.num_chapters || 6} chapters. Each must be substantive and tactical — no filler, no fluff. Each chapter should make a real trader want to read the next one.

Return ONLY valid JSON. No markdown:
{
  "bookIntro": "2-3 sentence hook that opens the book — grabs the reader immediately",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title",
      "tagline": "One punchy sentence hook for this chapter",
      "sections": ["Section 1 name", "Section 2 name", "Section 3 name"],
      "keyTakeaway": "The single most important thing the reader walks away with"
    }
  ]
}`,
        },
      ],
      { search: false, tokens: 2000, system }
    )

    const outline = safeJSON<OutlineResult>(raw)
    if (!outline || !outline.chapters) throw new Error('Failed to build outline — try again')

    // Create product from idea
    const { data: product, error: prodErr } = await db
      .from('products')
      .insert({
        idea_id,
        title: idea.title,
        subtitle: idea.subtitle,
        target_audience: idea.target_audience,
        price: idea.price_estimate,
        product_type: idea.product_type,
        status: 'in_production',
        outline_json: outline,
        book_intro: outline.bookIntro,
      })
      .select()
      .single()

    if (prodErr || !product) throw new Error(prodErr?.message || 'Failed to create product')

    // Update idea status to approved
    await db.from('ideas').update({ status: 'approved' }).eq('id', idea_id)

    // Create chapter placeholder rows
    const chapterRows = outline.chapters.map((ch: OutlineChapter) => ({
      product_id: product.id,
      chapter_number: ch.number,
      title: ch.title,
      tagline: ch.tagline,
      sections: ch.sections,
      key_takeaway: ch.keyTakeaway,
      status: 'pending',
    }))

    const { error: chapErr } = await db.from('chapters').insert(chapterRows)
    if (chapErr) throw new Error(chapErr.message)

    return NextResponse.json({ product_id: product.id, outline })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
