'use client'
import { C } from '@/lib/colors'
import { Product } from '@/lib/supabase'

interface HeaderProps {
  products?: Product[]
  onResearch?: () => void
  mobileTab?: string
  onMobileTab?: (tab: string) => void
}

export function Header({ products = [], onResearch }: HeaderProps) {
  const inReview  = products.filter(p => p.status === 'in_review').length
  const ready     = products.filter(p => p.status === 'ready').length
  const published = products.filter(p => p.status === 'published').length

  return (
    <header style={{
      borderBottom:   `1px solid ${C.border}`,
      padding:        '0 20px',
      height:         56,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      background:     C.surf,
      position:       'sticky',
      top:            0,
      zIndex:         50,
      flexShrink:     0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width:        34,
          height:       34,
          background:   `linear-gradient(135deg, ${C.purple}, ${C.purpleLt})`,
          borderRadius: 8,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontWeight:   900,
          fontSize:     16,
          color:        C.white,
          letterSpacing: '-0.02em',
          flexShrink:   0,
        }}>A</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: C.white, lineHeight: 1.2 }}>
            ATG PRODUCT ENGINE
          </div>
          <div style={{ fontSize: 10, color: C.gray, fontFamily: 'monospace', lineHeight: 1 }}>
            Arnold Trading Group · Content Pipeline
          </div>
        </div>
      </div>

      {/* Status + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Pipeline counts — hidden on very small screens via inline style */}
        <div style={{ display: 'flex', gap: 8, fontSize: 11, fontFamily: 'monospace' }}>
          {inReview > 0 && (
            <span style={{ color: C.amber, background: `${C.amber}18`, border: `1px solid ${C.amber}30`, borderRadius: 12, padding: '2px 8px' }}>
              {inReview} in review
            </span>
          )}
          {ready > 0 && (
            <span style={{ color: C.green, background: `${C.green}18`, border: `1px solid ${C.green}30`, borderRadius: 12, padding: '2px 8px' }}>
              {ready} ready
            </span>
          )}
          {published > 0 && (
            <span style={{ color: C.purpleLt, background: `${C.purple}18`, border: `1px solid ${C.purple}30`, borderRadius: 12, padding: '2px 8px' }}>
              {published} live
            </span>
          )}
        </div>

        {onResearch && (
          <button
            onClick={onResearch}
            style={{
              background:   C.green,
              color:        '#000',
              border:       'none',
              borderRadius: 8,
              padding:      '7px 16px',
              fontSize:     12,
              fontWeight:   700,
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }}
          >
            + Research
          </button>
        )}
      </div>
    </header>
  )
}
