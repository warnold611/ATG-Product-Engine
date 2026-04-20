import { NextResponse } from 'next/server'
import { callClaude, buildSystemPrompt } from '@/lib/claude'
import { getServiceClient } from '@/lib/supabase'

export async function POST() {
  try {
    const db = getServiceClient()

    // Load settings for brand voice injection
    const { data: settings } = await db.from('settings').select('*').single()

    const system = buildSystemPrompt(settings || {})

    const raw = await callClaude(
      [
        {
          role: 'user',
          content: `Search the web RIGHT NOW for real, current pain points and education gaps that traders are experiencing in 2025 across these specific niches:
1. Prop firm trading (FTMO, TopStep, Apex, MyFundedFutures)
2. Futures day trading (/NQ, /ES, /CL micro contracts)
3. Options trading (retail, 0DTE, spreads)
4. Day trading psychology and consistency

Look for: Reddit posts (/r/Daytrading, /r/FuturesTrading, /r/options, /r/TopstepTrader), Twitter/X threads, trading forum discussions, recurring questions in communities.

Focus on SPECIFIC gaps: things traders desperately need help with that current books, YouTube, or courses are NOT adequately addressing in 2025.

Return: The TOP 8 specific, actionable knowledge gaps. For each: what the problem is, why existing resources miss it, and which trader type experiences it most.`,
        },
      ],
      { search: true, tokens: 3000, system }
    )

    return NextResponse.json({ research: raw })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
