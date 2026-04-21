'use client'
import { useState, useEffect, useCallback } from 'react'
import { C } from '@/lib/colors'
import { Product, Idea } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { KanbanCard } from '@/components/KanbanCard'
import { ProductPanel } from '@/components/ProductPanel'
import { PinLock } from '@/components/PinLock'
import { ResearchModal } from '@/components/ResearchModal'

const COLUMNS: { key: Product['status']; label: string; color: string }[] = [
  { key: 'in_production', label: 'In Production', color: C.purple   },
  { key: 'in_review',     label: 'In Review',     color: C.amber    },
  { key: 'ready',         label: 'Ready',         color: C.green    },
  { key: 'published',     label: 'Published',     color: C.purpleLt },
]

export default function DashboardPage() {
  const [products,       setProducts]       = useState<Product[]>([])
  const [loading,        setLoading]        = useState(true)
  const [selected,       setSelected]       = useState<Product | null>(null)
  const [showResearch,   setShowResearch]   = useState(false)
  const [generating,     setGenerating]     = useState(false)
  const [unlocked,       setUnlocked]       = useState(false)
  const [pinChecked,     setPinChecked]     = useState(false)
  const [panelOpen,      setPanelOpen]      = useState(false)

  // ── Load settings, check PIN ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ settings: s }) => {
        if (!s?.pin_enabled) {
          setUnlocked(true)
        } else {
          // Check for existing session token
          const token = localStorage.getItem('atg_session')
          if (token) {
            // Optimistically trust it — server will re-verify on API calls
            setUnlocked(true)
          }
        }
        setPinChecked(true)
      })
  }, [])

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    const res  = await fetch('/api/products')
    const data = await res.json()
    if (data.products) {
      const sorted = data.products.map((p: Product) => ({
        ...p,
        chapters: (p.chapters || []).sort((a, b) => a.chapter_number - b.chapter_number),
      }))
      setProducts(sorted)
      // Refresh selected product if open
      if (selected) {
        const fresh = sorted.find((p: Product) => p.id === selected.id)
        if (fresh) setSelected(fresh)
      }
    }
    setLoading(false)
  }, [selected])

  useEffect(() => {
    if (unlocked) loadProducts()
  }, [unlocked, loadProducts])

  // ── Generate a chapter ────────────────────────────────────────────────────
  const handleGenerateChapter = async (chapterId: string) => {
    setGenerating(true)
    await fetch('/api/generate-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: chapterId }),
    })
    setGenerating(false)
    await loadProducts()
  }

  // ── Generate marketing ────────────────────────────────────────────────────
  const handleGenerateMarketing = async (productId: string) => {
    setGenerating(true)
    await fetch('/api/generate-marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    setGenerating(false)
    await loadProducts()
  }

  // ── Produce idea directly from IDEAS column ───────────────────────────────
  const handleProduceIdea = async (idea: Idea) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_id: idea.id }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
    } finally {
      setGenerating(false)
      await loadProducts()
    }
  }

  // ── Select card ───────────────────────────────────────────────────────────
  const selectProduct = (p: Product) => {
    setSelected(p)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setTimeout(() => setSelected(null), 200)
  }

  // ── PIN gate ──────────────────────────────────────────────────────────────
  if (!pinChecked) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      </div>
    )
  }

  if (!unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />
  }

  // ── Dashboard layout ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <Header
        products={products}
        onResearch={() => setShowResearch(true)}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Kanban board */}
        <div style={{
          flex:       1,
          overflow:   'auto',
          padding:    '20px',
          display:    'flex',
          gap:        14,
          minWidth:   0,
        }}>
          {loading ? (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gray, fontSize: 14 }}>
              Loading pipeline…
            </div>
          ) : (
            <>
              {/* IDEAS column — shows new/unapproved ideas */}
              <IdeasColumn
                onResearch={() => setShowResearch(true)}
                onProduce={handleProduceIdea}
                producing={generating}
              />

              {/* Kanban columns */}
              {COLUMNS.map(col => {
                const colProducts = products.filter(p => p.status === col.key)
                return (
                  <div key={col.key} style={{
                    width:        220,
                    minWidth:     220,
                    display:      'flex',
                    flexDirection: 'column',
                    gap:          0,
                  }}>
                    {/* Column header */}
                    <div style={{
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'space-between',
                      padding:      '0 0 12px',
                      borderBottom: `2px solid ${col.color}60`,
                      marginBottom: 14,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.grayLt, letterSpacing: '0.06em' }}>
                          {col.label.toUpperCase()}
                        </span>
                      </div>
                      <span style={{
                        background: `${col.color}18`,
                        border:     `1px solid ${col.color}40`,
                        color:      col.color,
                        borderRadius: 10,
                        padding:    '1px 7px',
                        fontSize:   11,
                        fontFamily: 'monospace',
                      }}>
                        {colProducts.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      {colProducts.length === 0 ? (
                        <div style={{
                          border:       `1px dashed ${C.border}`,
                          borderRadius: 10,
                          padding:      '20px 12px',
                          textAlign:    'center',
                          fontSize:     12,
                          color:        C.grayDk,
                        }}>
                          Empty
                        </div>
                      ) : (
                        colProducts.map(p => (
                          <KanbanCard
                            key={p.id}
                            product={p}
                            onClick={() => selectProduct(p)}
                            isActive={selected?.id === p.id}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Product detail panel */}
        {selected && (
          <div style={{
            width:        400,
            minWidth:     400,
            borderLeft:   `1px solid ${C.border}`,
            display:      'flex',
            flexDirection: 'column',
            animation:    panelOpen ? 'slideIn 0.2s ease' : undefined,
            overflow:     'hidden',
          }}>
            <ProductPanel
              product={selected}
              onClose={closePanel}
              onRefresh={loadProducts}
              onGenerateChapter={handleGenerateChapter}
              onGenerateMarketing={handleGenerateMarketing}
              generating={generating}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        onResearch={() => setShowResearch(true)}
        onSettings={() => window.location.href = '/settings'}
      />

      {/* Research modal */}
      {showResearch && (
        <ResearchModal
          onClose={() => setShowResearch(false)}
          onDone={() => { setShowResearch(false); loadProducts() }}
        />
      )}
    </div>
  )
}

// ── Ideas side column (shows raw ideas queue) ─────────────────────────────────
function IdeasColumn({
  onResearch,
  onProduce,
  producing,
}: {
  onResearch: () => void
  onProduce: (idea: Idea) => void
  producing: boolean
}) {
  const [ideas,   setIdeas]   = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ideas')
      .then(r => r.json())
      .then(d => {
        setIdeas((d.ideas || []).filter((i: Idea) => i.status === 'new'))
        setLoading(false)
      })
  }, [producing]) // re-fetch when producing state changes (idea just got approved)

  return (
    <div style={{ width: 220, minWidth: 220, display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 12px', borderBottom: `2px solid ${C.grayDk}`, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.gray }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.grayLt, letterSpacing: '0.06em' }}>IDEAS</span>
        </div>
        {ideas.length > 0 && (
          <span style={{
            background: `${C.gray}18`, border: `1px solid ${C.grayDk}`,
            color: C.gray, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontFamily: 'monospace',
          }}>
            {ideas.length}
          </span>
        )}
      </div>

      {/* Research trigger */}
      <div
        onClick={onResearch}
        style={{
          border: `1px dashed ${C.border}`, borderRadius: 10, padding: '12px',
          textAlign: 'center', fontSize: 12, color: C.gray, cursor: 'pointer',
          transition: 'all 0.15s', marginBottom: ideas.length ? 10 : 0,
        }}
      >
        <span style={{ marginRight: 6 }}>🔍</span>
        <span style={{ color: C.grayLt, fontWeight: 500 }}>+ New Research</span>
      </div>

      {/* Pending ideas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: C.grayDk, fontSize: 12 }}>…</div>
      ) : ideas.map(idea => (
        <div
          key={idea.id}
          style={{
            background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '12px', marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 11, color: C.purpleLt, fontFamily: 'monospace', marginBottom: 5 }}>
            {idea.price_estimate} · {idea.num_chapters}ch
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.white, lineHeight: 1.35, marginBottom: 6 }}>
            {idea.title}
          </div>
          {idea.gap && (
            <div style={{ fontSize: 11, color: C.gray, lineHeight: 1.4, marginBottom: 8 }}>
              {idea.gap.length > 80 ? idea.gap.slice(0, 80) + '…' : idea.gap}
            </div>
          )}
          <button
            disabled={producing}
            onClick={() => onProduce(idea)}
            style={{
              width: '100%', background: producing ? C.surf3 : C.green,
              color: producing ? C.gray : '#000', border: 'none', borderRadius: 7,
              padding: '7px', fontSize: 11, fontWeight: 700, cursor: producing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {producing ? 'Working…' : '→ Produce'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
function MobileNav({ onResearch, onSettings }: { onResearch: () => void; onSettings: () => void }) {
  return (
    <nav style={{
      display:        'none',
      position:       'fixed',
      bottom:         0,
      left:           0,
      right:          0,
      height:         64,
      background:     C.surf,
      borderTop:      `1px solid ${C.border}`,
      zIndex:         40,
      alignItems:     'center',
      justifyContent: 'space-around',
      // Shown via CSS media query in globals.css
    }}
    className="mobile-nav"
    >
      <NavBtn label="Pipeline" icon="⬜" onClick={() => {}} active />
      <button
        onClick={onResearch}
        style={{
          background:     C.green,
          border:         'none',
          borderRadius:   '50%',
          width:          52,
          height:         52,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       22,
          cursor:         'pointer',
          color:          '#000',
          fontWeight:     700,
          marginTop:      -20,
        }}
      >+</button>
      <NavBtn label="Settings" icon="⚙" onClick={onSettings} />
    </nav>
  )
}

function NavBtn({ label, icon, onClick, active }: { label: string; icon: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'transparent', border: 'none', color: active ? C.purpleLt : C.gray, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 18, cursor: 'pointer', padding: '8px 16px' }}
    >
      {icon}
      <span style={{ fontSize: 10 }}>{label}</span>
    </button>
  )
}
