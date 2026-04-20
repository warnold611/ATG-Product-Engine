import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Single client — RLS disabled, PIN protection at app layer
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server routes use same client (RLS disabled on all tables)
export function getServiceClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Settings {
  id: number
  pin_enabled: boolean
  pin_hash: string | null
  pin_session_hours: number
  brand_voice: string | null
  atg_philosophy: string | null
  trading_background: string | null
  niche_focus: string[]
  default_price_range: string | null
  created_at: string
  updated_at: string
}

export interface Idea {
  id: string
  title: string
  subtitle: string | null
  target_audience: string | null
  gap: string | null
  angle: string | null
  why_it_sells: string | null
  price_estimate: string | null
  page_range: string | null
  num_chapters: number
  product_type: 'ebook' | 'template' | 'checklist' | 'workbook'
  status: 'new' | 'approved' | 'rejected'
  research_source: string | null
  created_at: string
}

export interface Product {
  id: string
  idea_id: string | null
  title: string
  subtitle: string | null
  target_audience: string | null
  price: string | null
  product_type: 'ebook' | 'template' | 'checklist' | 'workbook'
  status: 'in_production' | 'in_review' | 'ready' | 'published'
  outline_json: Record<string, unknown> | null
  book_intro: string | null
  notes: string | null
  gumroad_url: string | null
  review_checklist_json: ReviewChecklist
  published_at: string | null
  created_at: string
  updated_at: string
  chapters?: Chapter[]
  marketing?: MarketingKit
}

export interface ReviewChecklist {
  technical_accuracy: boolean
  platform_data_verified: boolean
  atg_brand_voice: boolean
  no_ai_tells: boolean
  legal_disclaimer: boolean
}

export interface Chapter {
  id: string
  product_id: string
  chapter_number: number
  title: string | null
  tagline: string | null
  sections: string[]
  key_takeaway: string | null
  content: string | null
  status: 'pending' | 'generating' | 'complete'
  created_at: string
  updated_at: string
}

export interface MarketingKit {
  id: string
  product_id: string
  gumroad_json: GumroadData | null
  x_thread_json: string[] | null
  tiktok_json: TikTokData | null
  instagram_json: InstagramData | null
  created_at: string
  updated_at: string
}

export interface GumroadData {
  productTitle: string
  tagline: string
  description: string
  price: string
  tags: string[]
}

export interface TikTokData {
  hook: string
  script: string
  caption: string
  hashtags: string[]
}

export interface InstagramData {
  caption: string
  hashtags: string[]
}
