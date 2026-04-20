import { NextRequest, NextResponse } from 'next/server'
import { callClaude, buildSystemPrompt } from '@/lib/claude'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { chapter_id } = await req.json()
    if (!chapter_id) return NextResponse.json({ error: 'chapter_id required' }, { status: 400 })

    const db = getServiceClient()

    const { data: chapter, error: chapErr } = await db
      .from('chapters')
      .select('*, products(*)')
      .eq('id', chapter_id)
      .single()

    if (chapErr || !chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })

    const product = chapter.products
    const { data: settings } = await db.from('settings').select('*').single()
    const system = buildSystemPrompt(settings || {})

    // Mark as generating
    await db.from('chapters').update({ status: 'generating' }).eq('id', chapter_id)

    const content = await callClaude(
      [
        {
          role: 'user',
          content: `Write Chapter ${chapter.chapter_number} of the ebook: "${product.title}"

CHAPTER: ${chapter.title}
HOOK: ${chapter.tagline}
SECTIONS TO COVER: ${(chapter.sections || []).join(' | ')}
KEY TAKEAWAY: ${chapter.key_takeaway}
READER: ${product.target_audience || 'active day traders'}

Use web search to verify any platform-specific rules, current prop firm requirements, recent market data, or specific metrics mentioned in this chapter. Accuracy matters — traders will fact-check you.

Rules:
- Write 700-950 words
- Tone: experienced trader talking to another trader. Direct, no corporate speak, no academic fluff
- Be specific: include real trade examples, actual scenario walkthroughs, concrete numbers where relevant
- Use the section names as ## subheadings
- Do NOT include the chapter number in the title — just write the chapter title as the H1
- End with 1-2 sentences that lead naturally into the next concept`,
        },
      ],
      { search: true, tokens: 2000, system }
    )

    // Save content, mark complete
    const { error: updateErr } = await db
      .from('chapters')
      .update({ content, status: 'complete' })
      .eq('id', chapter_id)

    if (updateErr) throw new Error(updateErr.message)

    // Check if all chapters are complete — if so, advance product to in_review
    const { data: allChapters } = await db
      .from('chapters')
      .select('status')
      .eq('product_id', chapter.product_id)

    const allDone = allChapters?.every((c) => c.status === 'complete')
    if (allDone) {
      await db
        .from('products')
        .update({ status: 'in_review' })
        .eq('id', chapter.product_id)
    }

    return NextResponse.json({ chapter_id, content, status: 'complete' })
  } catch (e: unknown) {
    // Mark chapter as failed (back to pending so it can retry)
    const db = getServiceClient()
    const { chapter_id } = await req.json().catch(() => ({ chapter_id: null }))
    if (chapter_id) {
      await db.from('chapters').update({ status: 'pending' }).eq('id', chapter_id)
    }

    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
