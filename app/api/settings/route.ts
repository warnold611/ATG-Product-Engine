import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('settings').select('*').single()
    if (error) throw new Error(error.message)
    // Never expose pin_hash to client
    const { pin_hash: _, ...safe } = data
    return NextResponse.json({ settings: safe })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getServiceClient()

    // Strip fields that should only be set via verify-pin route
    const { pin_hash: _ph, id: _id, created_at: _ca, ...updates } = body

    const { data, error } = await db
      .from('settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single()

    if (error) throw new Error(error.message)
    const { pin_hash: _pinHash, ...safe } = data
    return NextResponse.json({ settings: safe })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
