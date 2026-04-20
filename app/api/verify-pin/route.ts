import { NextRequest, NextResponse } from 'next/server'
import { verifyPin, hashPin, signSessionToken } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { pin, action } = await req.json()

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }

    // Must be 4-6 digits
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
    }

    const db = getServiceClient()
    const { data: settings } = await db.from('settings').select('*').single()

    // Action: set_pin — sets a new PIN (requires no existing PIN, or admin bypass)
    if (action === 'set_pin') {
      const pinHash = await hashPin(pin)
      await db.from('settings').update({ pin_hash: pinHash, pin_enabled: true }).eq('id', settings.id)
      const token = await signSessionToken(settings.pin_session_hours || 4)
      return NextResponse.json({ success: true, token })
    }

    // Action: clear_pin — disables PIN (requires current PIN verification first)
    if (action === 'clear_pin') {
      if (!settings.pin_hash) return NextResponse.json({ error: 'No PIN set' }, { status: 400 })
      const valid = await verifyPin(pin, settings.pin_hash)
      if (!valid) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
      await db.from('settings').update({ pin_hash: null, pin_enabled: false }).eq('id', settings.id)
      return NextResponse.json({ success: true })
    }

    // Default: verify PIN and issue session token
    if (!settings.pin_enabled || !settings.pin_hash) {
      return NextResponse.json({ error: 'PIN not enabled' }, { status: 400 })
    }

    const valid = await verifyPin(pin, settings.pin_hash)
    if (!valid) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })

    const token = await signSessionToken(settings.pin_session_hours || 4)
    return NextResponse.json({ success: true, token })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
