'use client'
import { C } from '@/lib/colors'
import { Product } from '@/lib/supabase'

interface KanbanCardProps {
  product: Product
  onClick: () => void
  isActive: boolean
}

const TYPE_COLORS: Record<string, string> = {
  ebook:     C.purpleLt,
  template:  C.amber,
  checklist: C.green,
  workbook:  '#60A5FA',
}

export function KanbanCard({ product, onClick, isActive }: KanbanCardProps) {
  const chapters     = product.chapters || []
  const totalCh      = chapters.length
  const completedCh  = chapters.filter(c => c.status === 'complete').length
  const pct          = totalCh > 0 ? Math.round((completedCh / totalCh) * 100) : 0
  const inProd       = product.status === 'in_production'
  const typeColor    = TYPE_COLORS[product.product_type] || C.purpleLt

  return (
    <div
      onClick={onClick}
      style={{
        background:   isActive ? `${C.purple}18` : C.surf2,
        border:       `1px solid ${isActive ? C.purple : C.border}`,
        borderRadius: 10,
        padding:      '14px 14px 12px',
        cursor:       'pointer',
        transition:   'all 0.15s',
        position:     'relative',
        marginBottom: 8,
      }}
    >
      {/* Type badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{
          background:   `${typeColor}18`,
          border:       `1px solid ${typeColor}40`,
          color:        typeColor,
          borderRadius: 20,
          padding:      '2px 8px',
          fontSize:     10,
          fontWeight:   600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {product.product_type}
        </span>
        {product.price && (
          <span style={{ fontSize: 11, color: C.green, fontFamily: 'monospace', fontWeight: 600 }}>
            {product.price}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize:   13,
        fontWeight: 600,
        color:      C.white,
        lineHeight: 1.35,
        marginBottom: 6,
        display:    '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow:   'hidden',
      }}>
        {product.title}
      </div>

      {/* Audience */}
      {product.target_audience && (
        <div style={{
          fontSize:   11,
          color:      C.gray,
          marginBottom: inProd ? 10 : 0,
          display:    '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow:   'hidden',
        }}>
          {product.target_audience}
        </div>
      )}

      {/* Progress bar for in_production */}
      {inProd && totalCh > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.gray, marginBottom: 4 }}>
            <span>{completedCh}/{totalCh} chapters</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width:      `${pct}%`,
              height:     '100%',
              background: `linear-gradient(90deg, ${C.purple}, ${C.green})`,
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
