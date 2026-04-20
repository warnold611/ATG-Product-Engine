import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getServiceClient()
  const { data, error } = await db
    .from('products')
    .select(`
      *,
      chapters(id, chapter_number, title, tagline, sections, key_takeaway, content, status),
      marketing(*)
    `)
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const db = getServiceClient()

  // If publishing, set published_at
  if (body.status === 'published' && !body.published_at) {
    body.published_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from('products')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getServiceClient()
  const { error } = await db.from('products').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
