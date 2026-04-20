import { NextRequest, NextResponse } from 'next/server'
import { callClaude, safeJSON, buildSystemPrompt } from '@/lib/claude'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { product_id } = await req.json()
    if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

    const db = getServiceClient()

    const { data: product } = await db.from('products').select('*').eq('id', product_id).single()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const { data: chapters } = await db
      .from('chapters')
      .select('chapter_number, title, sections')
      .eq('product_id', product_id)
      .order('chapter_number')

    const { data: settings } = await db.from('settings').select('*').single()
    const system = buildSystemPrompt(settings || {})

    const chapList = (chapters || [])
      .map((c) => `Ch${c.chapter_number}: ${c.title} — Covers: ${(c.sections || []).join(', ')}`)
      .join('\n')

    const raw = await callClaude(
      [
        {
          role: 'user',
          content: `Create complete, ready-to-use marketing copy for this trading ebook:

TITLE: ${product.title}
SUBTITLE: ${product.subtitle || ''}
AUDIENCE: ${product.target_audience || ''}
PRICE: ${product.price || '$27'}
CHAPTERS:
${chapList}

Requirements:
- Gumroad: write like a trader selling to traders — not a copywriter
- X thread: hook-driven, no hashtags in body tweets, CTA last
- TikTok: hook is spoken aloud in first 3 seconds, script has timestamps
- Instagram: story-based, value first, soft CTA at end

Return ONLY valid JSON. Zero markdown, zero preamble:
{
  "gumroad": {
    "productTitle": "Gumroad product title",
    "tagline": "One punchy line — no fluff",
    "description": "450-550 word listing. Lead with the problem, twist the knife, reveal the solution, bullet what's inside, who this is for, what changes after reading. Trader voice — direct, no marketing jargon.",
    "price": "${product.price || '$27'}",
    "tags": ["tag1","tag2","tag3","tag4","tag5","tag6"]
  },
  "xThread": [
    "Tweet 1: HOOK — bold statement or uncomfortable truth. No hashtags.",
    "Tweet 2", "Tweet 3", "Tweet 4", "Tweet 5", "Tweet 6",
    "Tweet 7: CTA — tell them what to do + [YOUR LINK]"
  ],
  "tiktok": {
    "hook": "Exact first 3 seconds spoken line — scroll-stopping",
    "script": "Full 60-second voiceover with [0:00] [0:10] [0:20] etc timestamps. Specific. No filler.",
    "caption": "TikTok caption under 150 chars",
    "hashtags": ["#daytrading","#propfirm","#futurestrading","#tradereducation","#tradinglife","#nqfutures","#financialfreedom"]
  },
  "instagram": {
    "caption": "280-360 word caption. First line = scroll stopper. Tell a story that hits the pain point. Deliver one big insight. Soft CTA at end. Trader voice.",
    "hashtags": ["#daytrading","#propfirm","#futurestrader","#tradereducation","#tradinglifestyle","#stockmarket","#wallstreet","#nqfutures","#tradingtips","#financialliteracy","#investingmindset","#forextrader","#optionstrading","#tradingcommunity","#buildingwealth"]
  }
}`,
        },
      ],
      { search: false, tokens: 4000, system }
    )

    const parsed = safeJSON<{
      gumroad: unknown
      xThread: unknown
      tiktok: unknown
      instagram: unknown
    }>(raw)
    if (!parsed) throw new Error('Failed to parse marketing copy — try again')

    // Upsert marketing record
    const { data: mkt, error: mktErr } = await db
      .from('marketing')
      .upsert(
        {
          product_id,
          gumroad_json: parsed.gumroad,
          x_thread_json: parsed.xThread,
          tiktok_json: parsed.tiktok,
          instagram_json: parsed.instagram,
        },
        { onConflict: 'product_id' }
      )
      .select()
      .single()

    if (mktErr) throw new Error(mktErr.message)

    // Advance product to ready if it was in_review
    if (product.status === 'in_review') {
      await db.from('products').update({ status: 'ready' }).eq('id', product_id)
    }

    return NextResponse.json({ marketing: mkt })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
