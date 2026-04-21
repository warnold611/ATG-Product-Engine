import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

function omitPinHash(data: Record<string, unknown>) {
  const { pin_hash, ...safe } = data
  void pin_hash
  return safe
}

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db.from('settings').select('*').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ settings: omitPinHash(data) })
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
    const updates = Object.fromEntries(
      Object.entries(body as Record<string, unknown>).filter(
        ([k]) => !['pin_hash', 'id', 'created_at'].includes(k)
      )
    )

    const { data, error } = await db
      .from('settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ settings: omitPinHash(data) })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
