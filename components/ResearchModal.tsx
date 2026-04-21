'use client'
import { useState } from 'react'
import { C } from '@/lib/colors'

interface Idea {
  id: string
  title: string
  subtitle: string | null
  target_audience: string | null
  gap: string | null
  why_it_sells: string | null
  price_estimate: string | null
  page_range: string | null
  num_chapters: number
  angle: string | null
}

interface ResearchModalProps {
  onClose: () => void
  onDone: () => void
}

type Stage = 'idle' | 'researching' | 'ideas' | 'generating'

export function ResearchModal({ onClose, onDone }: ResearchModalProps) {
  const [stage,     setStage]     = useState<Stage>('idle')
  const [ideas,     setIdeas]     = useState<Idea[]>([])
  const [selected,  setSelected]  = useState<Idea | null>(null)
  const [progress,  setProgress]  = useState('')
  const [error,     setError]     = useState('')
  const [genPct,    setGenPct]    = useState(0)

  const runResearch = async () => {
    setError('')
    setStage('researching')
    setProgress('Scanning trader forums, Reddit, X for market gaps…')

    try {
      const res1 = await fetch('/api/research', { method: 'POST' })
      const d1   = await res1.json()
      if (d1.error) throw new Error(d1.error)

      setProgress('Generating 6 ebook concepts from research…')

      const res2 = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ research: d1.research }),
      })
      const d2 = await res2.json()
      if (d2.error) throw new Error(d2.error)

      setIdeas(d2.ideas)
      setStage('ideas')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStage('idle')
    }
  }

  const startProduction = async () => {
    if (!selected) return
    setStage('generating')
    setProgress('Architecting chapter structure…')
    setGenPct(10)

    try {
      const res = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_id: selected.id }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)

      const { product_id, outline } = d
      const chapCount = outline.chapters.length

      for (let i = 0; i < chapCount; i++) {
        const ch = outline.chapters[i]
        setProgress(`Writing Chapter ${ch.number}: ${ch.title}…`)
        setGenPct(15 + Math.round((i / chapCount) * 80))

        // Get chapter ID from DB
        const chRes = await fetch(`/api/products/${product_id}`)
        const chData = await chRes.json()
        const chapters = chData.product?.chapters || []
        const chapRow  = chapters.find((c: { chapter_number: number }) => c.chapter_number === ch.number)
        if (!chapRow) continue

        await fetch('/api/generate-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapter_id: chapRow.id }),
        })
      }

      setGenPct(100)
      setProgress('eBook complete — moved to In Review')
      await new Promise(r => setTimeout(r, 1200))
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStage('ideas')
    }
  }

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      background:     'rgba(0,0,0,0.75)',
      zIndex:         100,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '20px',
    }}>
      <div style={{
        background:   C.surf,
        border:       `1px solid ${C.border}`,
        borderRadius: 16,
        width:        '100%',
        maxWidth:     760,
        maxHeight:    '88vh',
        display:      'flex',
        flexDirection: 'column',
        overflow:     'hidden',
        animation:    'fadeIn 0.2s ease',
      }}>
        {/* Modal header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Research Engine</div>
            <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
              {stage === 'idle' && 'Scan live web data → surface 6 market-gap ebook ideas'}
              {stage === 'researching' && 'Scanning trader communities across Reddit, X, and forums…'}
              {stage === 'ideas' && `${ideas.length} opportunities found — select one to produce`}
              {stage === 'generating' && 'Writing full ebook chapter by chapter…'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.gray, borderRadius: 8, padding: '5px 12px', fontSize: 13, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

          {/* IDLE */}
          {stage === 'idle' && (
            <div style={{ textAlign: 'center', paddingTop: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <p style={{ color: C.grayLt, fontSize: 14, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 28px' }}>
                Runs live web search across Reddit, X, and prop firm communities to find the exact pain points traders are paying to solve — right now in 2025.
              </p>
              {error && (
                <div style={{ background: C.redDm, border: `1px solid ${C.red}40`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: '#FCA5A5', fontSize: 13 }}>
                  ⚠ {error}
                </div>
              )}
              <button
                onClick={runResearch}
                style={{ background: C.green, color: '#000', border: 'none', borderRadius: 12, padding: '14px 40px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Start Research Engine →
              </button>
              <div style={{ marginTop: 10, fontSize: 11, color: C.gray }}>
                Takes 30–60 seconds · Uses live web search
              </div>
            </div>
          )}

          {/* RESEARCHING / GENERATING */}
          {(stage === 'researching' || stage === 'generating') && (
            <div style={{ textAlign: 'center', paddingTop: 32 }}>
              <div style={{ width: 48, height: 48, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 24px' }} />
              <div style={{ fontSize: 14, color: C.grayLt, marginBottom: 28 }}>{progress}</div>
              {stage === 'generating' && (
                <div style={{ maxWidth: 360, margin: '0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.gray, marginBottom: 6 }}>
                    <span>Progress</span><span>{genPct}%</span>
                  </div>
                  <div style={{ height: 5, background: C.surf2, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${genPct}%`, height: '100%', background: `linear-gradient(90deg, ${C.purple}, ${C.green})`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IDEAS */}
          {stage === 'ideas' && (
            <div>
              {error && (
                <div style={{ background: C.redDm, border: `1px solid ${C.red}40`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#FCA5A5', fontSize: 13 }}>
                  ⚠ {error}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 20 }}>
                {ideas.map(idea => {
                  const isSel = selected?.id === idea.id
                  return (
                    <div
                      key={idea.id}
                      onClick={() => setSelected(isSel ? null : idea)}
                      style={{
                        background:   isSel ? `${C.purple}18` : C.surf2,
                        border:       `2px solid ${isSel ? C.purple : C.border}`,
                        borderRadius: 12,
                        padding:      18,
                        cursor:       'pointer',
                        transition:   'all 0.15s',
                        position:     'relative',
                      }}
                    >
                      {isSel && (
                        <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, background: C.purple, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.white, fontWeight: 700 }}>✓</div>
                      )}
                      <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.purpleLt, marginBottom: 8, letterSpacing: '0.06em' }}>
                        {idea.price_estimate} · {idea.page_range} · {idea.num_chapters} chapters
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.white, lineHeight: 1.3, marginBottom: 4, paddingRight: 24 }}>
                        {idea.title}
                      </div>
                      {idea.subtitle && (
                        <div style={{ fontSize: 12, color: C.gray, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.4 }}>
                          {idea.subtitle}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: C.grayLt, lineHeight: 1.5, marginBottom: 8 }}>
                        <span style={{ color: C.green }}>Gap: </span>{idea.gap}
                      </div>
                      <div style={{ fontSize: 11, color: C.purpleLt, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                        <span style={{ color: C.gray }}>For: </span>{idea.target_audience}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {stage === 'ideas' && selected && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, background: C.surf2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 11, color: C.grayLt, marginBottom: 2 }}>Selected:</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{selected.title}</div>
              {selected.why_it_sells && (
                <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>↳ {selected.why_it_sells}</div>
              )}
            </div>
            <button
              onClick={startProduction}
              style={{ background: C.green, color: '#000', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Write This eBook →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
