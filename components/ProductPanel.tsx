'use client'
import { useState } from 'react'
import { C } from '@/lib/colors'
import { CopyButton } from './CopyButton'
import { Product, ReviewChecklist } from '@/lib/supabase'

interface ProductPanelProps {
  product: Product
  onClose: () => void
  onRefresh: () => void
  onGenerateChapter: (chapterId: string) => Promise<void>
  onGenerateMarketing: (productId: string) => Promise<void>
  generating: boolean
}

type PanelTab = 'overview' | 'chapters' | 'marketing' | 'review'
type MktTab   = 'gumroad' | 'x' | 'tiktok' | 'instagram'

const REVIEW_LABELS: Record<keyof ReviewChecklist, string> = {
  technical_accuracy:    '✓ Technical accuracy verified',
  platform_data_verified:'✓ Platform-specific data verified (prop firm rules, etc.)',
  atg_brand_voice:       '✓ ATG brand voice — trader-to-trader tone',
  no_ai_tells:           '✓ No AI tells, no corporate fluff',
  legal_disclaimer:      '✓ Legal/disclaimer language appropriate',
}

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function compileEbook(product: Product): string {
  const chapters = (product.chapters || []).sort((a, b) => a.chapter_number - b.chapter_number)
  let t = `${product.title}\n`
  if (product.subtitle) t += `${product.subtitle}\n`
  t += `${'═'.repeat(60)}\n`
  if (product.target_audience) t += `For: ${product.target_audience}  |  Price: ${product.price || ''}\n\n`
  if (product.book_intro) t += product.book_intro + '\n\n'
  t += `${'─'.repeat(60)}\nTABLE OF CONTENTS\n${'─'.repeat(60)}\n\n`
  chapters.forEach(c => t += `Chapter ${c.chapter_number}: ${c.title}\n`)
  t += `\n${'═'.repeat(60)}\n\n`
  chapters.forEach(c => {
    t += `CHAPTER ${c.chapter_number}: ${(c.title || '').toUpperCase()}\n`
    if (c.tagline) t += `${c.tagline}\n`
    t += `${'─'.repeat(50)}\n\n`
    if (c.content) t += c.content + '\n\n'
    if (c.key_takeaway) t += `KEY TAKEAWAY: ${c.key_takeaway}\n\n`
    t += `${'═'.repeat(60)}\n\n`
  })
  return t
}

export function ProductPanel({
  product, onClose, onRefresh, onGenerateChapter, onGenerateMarketing, generating,
}: ProductPanelProps) {
  const [tab,         setTab]         = useState<PanelTab>('overview')
  const [mktTab,      setMktTab]      = useState<MktTab>('gumroad')
  const [activeChap,  setActiveChap]  = useState(0)
  const [checklist,   setChecklist]   = useState<ReviewChecklist>(
    product.review_checklist_json || {
      technical_accuracy: false, platform_data_verified: false,
      atg_brand_voice: false, no_ai_tells: false, legal_disclaimer: false,
    }
  )
  const [gumroadUrl,  setGumroadUrl]  = useState(product.gumroad_url || '')
  const [savingUrl,   setSavingUrl]   = useState(false)
  const [savingCheck, setSavingCheck] = useState(false)
  const [advancing,   setAdvancing]   = useState(false)
  const [notes,       setNotes]       = useState(product.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const chapters     = (product.chapters || []).sort((a, b) => a.chapter_number - b.chapter_number)
  const marketing    = product.marketing
  const allChecked   = Object.values(checklist).every(Boolean)
  const inProduction = product.status === 'in_production'
  const pendingCh    = chapters.filter(c => c.status === 'pending')
  const completedCh  = chapters.filter(c => c.status === 'complete')

  const updateChecklist = async (key: keyof ReviewChecklist, val: boolean) => {
    const next = { ...checklist, [key]: val }
    setChecklist(next)
    setSavingCheck(true)
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_checklist_json: next }),
    })
    setSavingCheck(false)
  }

  const advanceStatus = async (newStatus: string) => {
    setAdvancing(true)
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setAdvancing(false)
    onRefresh()
  }

  const saveGumroadUrl = async () => {
    setSavingUrl(true)
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gumroad_url: gumroadUrl }),
    })
    setSavingUrl(false)
    onRefresh()
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNotes(false)
  }

  const STATUS_NEXT: Record<string, { label: string; next: string; color: string }> = {
    in_production: { label: 'Send to Review', next: 'in_review', color: C.amber },
    in_review:     { label: 'Approve → Ready', next: 'ready',    color: C.green },
    ready:         { label: 'Mark Published',  next: 'published', color: C.purpleLt },
  }

  const nextAction = STATUS_NEXT[product.status]
  const reviewBlocked = product.status === 'in_review' && !allChecked

  const tabStyle = (t: PanelTab) => ({
    flex: 1,
    background:   tab === t ? C.purple : 'transparent',
    color:        tab === t ? C.white : C.grayLt,
    border:       'none',
    borderRadius: 7,
    padding:      '8px 4px',
    fontSize:     12,
    fontWeight:   tab === t ? 600 : 400,
    cursor:       'pointer' as const,
  })

  return (
    <div style={{
      width:      '100%',
      height:     '100%',
      display:    'flex',
      flexDirection: 'column',
      background: C.surf,
      overflow:   'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        padding:      '16px 20px 12px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink:   0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <StatusBadge status={product.status} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => downloadTxt(
                `${product.title.replace(/[^a-z0-9 ]/gi, '').replace(/ /g, '_')}_ATG.txt`,
                compileEbook(product)
              )}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.grayLt, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              ↓ TXT
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.gray, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.white, lineHeight: 1.3, marginBottom: 2 }}>
          {product.title}
        </div>
        {product.subtitle && (
          <div style={{ fontSize: 12, color: C.grayLt, fontStyle: 'italic' }}>{product.subtitle}</div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 3, background: C.surf2, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
          {(['overview','chapters','marketing','review'] as PanelTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 24px' }}>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <InfoRow label="TARGET AUDIENCE" value={product.target_audience || '—'} />
            <InfoRow label="PRICE" value={product.price || '—'} />
            <InfoRow label="TYPE" value={product.product_type} />
            <InfoRow label="CHAPTERS" value={`${completedCh.length}/${chapters.length} complete`} />
            {product.book_intro && (
              <div style={{ marginBottom: 16 }}>
                <Label>BOOK INTRO</Label>
                <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', fontSize: 13, color: C.grayLt, lineHeight: 1.7, fontStyle: 'italic' }}>
                  {product.book_intro}
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <Label>NOTES</Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes, revisions, ideas..."
                style={{
                  width:        '100%',
                  minHeight:    80,
                  background:   C.surf2,
                  border:       `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding:      '10px 12px',
                  color:        C.grayLt,
                  fontSize:     13,
                  lineHeight:   1.6,
                  resize:       'vertical',
                  fontFamily:   'inherit',
                  outline:      'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  style={{ background: C.surf3, border: `1px solid ${C.border}`, color: C.grayLt, borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}
                >
                  {savingNotes ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </div>

            {/* Gumroad URL */}
            {(product.status === 'ready' || product.status === 'published') && (
              <div style={{ marginBottom: 16 }}>
                <Label>GUMROAD / PAYHIP URL</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={gumroadUrl}
                    onChange={e => setGumroadUrl(e.target.value)}
                    placeholder="https://gumroad.com/l/..."
                    style={{
                      flex:        1,
                      background:  C.surf2,
                      border:      `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding:     '8px 12px',
                      color:       C.white,
                      fontSize:    13,
                      outline:     'none',
                    }}
                  />
                  <button
                    onClick={saveGumroadUrl}
                    disabled={savingUrl}
                    style={{ background: C.green, color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {savingUrl ? '…' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Status advance */}
            {nextAction && (
              <div style={{ marginTop: 20, padding: '14px 16px', background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                {reviewBlocked && (
                  <div style={{ fontSize: 11, color: C.amber, marginBottom: 10 }}>
                    ⚠ Complete all 5 review checklist items before approving
                  </div>
                )}
                {product.status === 'ready' && !gumroadUrl.trim() && (
                  <div style={{ fontSize: 11, color: C.amber, marginBottom: 10 }}>
                    ⚠ Add a Gumroad/Payhip URL before publishing
                  </div>
                )}
                <button
                  onClick={() => advanceStatus(nextAction.next)}
                  disabled={advancing || reviewBlocked || (product.status === 'ready' && !gumroadUrl.trim())}
                  style={{
                    width:        '100%',
                    background:   (reviewBlocked || (product.status === 'ready' && !gumroadUrl.trim())) ? C.grayDk : nextAction.color,
                    color:        (reviewBlocked || (product.status === 'ready' && !gumroadUrl.trim())) ? C.gray : '#000',
                    border:       'none',
                    borderRadius: 8,
                    padding:      '11px',
                    fontSize:     13,
                    fontWeight:   700,
                    cursor:       advancing ? 'wait' : 'pointer',
                  }}
                >
                  {advancing ? 'Updating…' : nextAction.label}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CHAPTERS ─────────────────────────────────────────── */}
        {tab === 'chapters' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* Chapter tab buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {chapters.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChap(i)}
                  style={{
                    background:   activeChap === i ? C.purple : C.surf2,
                    border:       `1px solid ${activeChap === i ? C.purple : c.status === 'complete' ? C.green + '60' : C.border}`,
                    color:        activeChap === i ? C.white : c.status === 'complete' ? C.green : C.grayLt,
                    borderRadius: 7,
                    padding:      '5px 12px',
                    fontSize:     12,
                    cursor:       'pointer',
                  }}
                >
                  {c.status === 'complete' ? '✓ ' : c.status === 'generating' ? '● ' : ''}Ch {c.chapter_number}
                </button>
              ))}
            </div>

            {chapters[activeChap] && (() => {
              const ch = chapters[activeChap]
              const isPending = ch.status === 'pending'
              const isGenerating = ch.status === 'generating'

              return (
                <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.purpleLt, fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 4 }}>
                        CHAPTER {ch.chapter_number} OF {chapters.length}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{ch.title}</div>
                      {ch.tagline && <div style={{ fontSize: 12, color: C.grayLt, fontStyle: 'italic', marginTop: 2 }}>{ch.tagline}</div>}
                    </div>
                    {ch.content && <CopyButton text={ch.content} label="Copy" />}
                  </div>

                  {ch.sections?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {ch.sections.map(s => (
                        <span key={s} style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}40`, color: C.purpleLt, borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {isPending && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ color: C.gray, fontSize: 13, marginBottom: 16 }}>Chapter not yet written</div>
                      <button
                        onClick={async () => { await onGenerateChapter(ch.id); onRefresh() }}
                        disabled={generating}
                        style={{ background: C.purple, color: C.white, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {generating ? 'Writing…' : 'Write This Chapter'}
                      </button>
                    </div>
                  )}

                  {isGenerating && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 12px' }} />
                      <div style={{ color: C.grayLt, fontSize: 13 }}>Writing chapter with live web search…</div>
                    </div>
                  )}

                  {ch.content && (
                    <div style={{ fontSize: 14, lineHeight: 1.8, color: C.grayLt, whiteSpace: 'pre-wrap', fontFamily: "Georgia, 'Times New Roman', serif", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                      {ch.content}
                    </div>
                  )}

                  {ch.key_takeaway && (
                    <div style={{ marginTop: 16, padding: '10px 14px', background: `${C.green}10`, border: `1px solid ${C.green}30`, borderRadius: 8, fontSize: 12, color: C.green }}>
                      <strong>Key Takeaway:</strong> {ch.key_takeaway}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Generate pending chapters button */}
            {inProduction && pendingCh.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  onClick={async () => {
                    for (const ch of pendingCh) {
                      await onGenerateChapter(ch.id)
                      onRefresh()
                    }
                  }}
                  disabled={generating}
                  style={{ background: C.green, color: '#000', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {generating ? 'Writing…' : `Write All ${pendingCh.length} Remaining Chapters`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MARKETING ─────────────────────────────────────────── */}
        {tab === 'marketing' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {!marketing ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ color: C.gray, fontSize: 14, marginBottom: 20 }}>
                  Marketing kit not yet generated
                </div>
                <button
                  onClick={async () => { await onGenerateMarketing(product.id); onRefresh() }}
                  disabled={generating}
                  style={{ background: C.green, color: '#000', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  {generating ? 'Generating…' : 'Generate Marketing Kit'}
                </button>
              </div>
            ) : (
              <>
                {/* Mkt tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: C.surf2, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
                  {([['gumroad','🛒 Gumroad'],['x','𝕏 Thread'],['tiktok','▶ TikTok'],['instagram','📸 IG']] as [MktTab,string][]).map(([k,l]) => (
                    <button key={k} onClick={() => setMktTab(k)} style={{
                      flex: 1, background: mktTab === k ? C.purple : 'transparent',
                      color: mktTab === k ? C.white : C.grayLt, border: 'none',
                      borderRadius: 8, padding: '7px 4px', fontSize: 11,
                      fontWeight: mktTab === k ? 600 : 400, cursor: 'pointer',
                    }}>{l}</button>
                  ))}
                </div>

                {mktTab === 'gumroad' && marketing.gumroad_json && (() => {
                  const g = marketing.gumroad_json as { productTitle: string; tagline: string; description: string; price: string; tags: string[] }
                  return (
                    <div>
                      <MktField label="PRODUCT TITLE" value={g.productTitle} />
                      <MktField label="TAGLINE"        value={g.tagline} />
                      <MktField label="PRICE"          value={g.price} />
                      <MktLong  label="DESCRIPTION"    value={g.description} />
                      <div style={{ marginBottom: 12 }}>
                        <Label>TAGS</Label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(g.tags || []).map(t => (
                            <span key={t} style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}40`, color: C.purpleLt, borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {mktTab === 'x' && (() => {
                  const tweets = (marketing.x_thread_json || []) as string[]
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <CopyButton text={tweets.join('\n\n')} label="Copy Thread" />
                      </div>
                      {tweets.map((tw, i) => (
                        <div key={i} style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: C.purpleLt, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 6 }}>
                                TWEET {i + 1}{i === 0 ? ' — HOOK' : i === tweets.length - 1 ? ' — CTA' : ''}
                              </div>
                              <div style={{ fontSize: 13, lineHeight: 1.6, color: C.white }}>{tw}</div>
                              <div style={{ fontSize: 10, color: tw.length > 260 ? C.red : C.gray, marginTop: 4, fontFamily: 'monospace' }}>
                                {tw.length}/280
                              </div>
                            </div>
                            <CopyButton text={tw} small />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {mktTab === 'tiktok' && marketing.tiktok_json && (() => {
                  const tt = marketing.tiktok_json as { hook: string; script: string; caption: string; hashtags: string[] }
                  return (
                    <div>
                      <MktField label="HOOK — FIRST 3 SECONDS" value={tt.hook} />
                      <MktLong  label="60-SECOND SCRIPT"        value={tt.script} />
                      <MktField label="CAPTION"                 value={tt.caption} />
                      <MktLong  label="HASHTAGS"                value={(tt.hashtags || []).join(' ')} />
                    </div>
                  )
                })()}

                {mktTab === 'instagram' && marketing.instagram_json && (() => {
                  const ig = marketing.instagram_json as { caption: string; hashtags: string[] }
                  return (
                    <div>
                      <MktLong label="CAPTION"   value={ig.caption} />
                      <MktLong label="HASHTAGS"  value={(ig.hashtags || []).join(' ')} />
                    </div>
                  )
                })()}

                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <button
                    onClick={async () => { await onGenerateMarketing(product.id); onRefresh() }}
                    disabled={generating}
                    style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.grayLt, borderRadius: 8, padding: '8px 18px', fontSize: 12, cursor: 'pointer' }}
                  >
                    {generating ? 'Regenerating…' : '↺ Regenerate Kit'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── REVIEW ─────────────────────────────────────────────── */}
        {tab === 'review' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontSize: 13, color: C.grayLt, marginBottom: 20, lineHeight: 1.6 }}>
              Complete all 5 items before approving to Ready. This checkpoint is mandatory — it cannot be bypassed.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(Object.entries(REVIEW_LABELS) as [keyof ReviewChecklist, string][]).map(([key, label]) => (
                <div
                  key={key}
                  onClick={() => updateChecklist(key, !checklist[key])}
                  style={{
                    display:    'flex',
                    alignItems: 'flex-start',
                    gap:        12,
                    padding:    '14px 16px',
                    background: checklist[key] ? `${C.green}10` : C.surf2,
                    border:     `1px solid ${checklist[key] ? C.green + '40' : C.border}`,
                    borderRadius: 10,
                    cursor:     'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width:        20,
                    height:       20,
                    borderRadius: 5,
                    border:       `2px solid ${checklist[key] ? C.green : C.grayDk}`,
                    background:   checklist[key] ? C.green : 'transparent',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    fontSize:     11,
                    color:        '#000',
                    flexShrink:   0,
                    transition:   'all 0.15s',
                  }}>
                    {checklist[key] ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 13, color: checklist[key] ? C.white : C.grayLt, lineHeight: 1.4 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {savingCheck && (
              <div style={{ textAlign: 'center', fontSize: 11, color: C.gray, marginTop: 10 }}>Saving…</div>
            )}
            {allChecked && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: `${C.green}10`, border: `1px solid ${C.green}30`, borderRadius: 8, fontSize: 13, color: C.green, textAlign: 'center' }}>
                ✓ All items complete — ready to approve
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: C.purpleLt, fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.white, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span>{value}</span>
        <CopyButton text={value} small />
      </div>
    </div>
  )
}

function MktField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.white, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ lineHeight: 1.5 }}>{value}</span>
        <CopyButton text={value} small />
      </div>
    </div>
  )
}

function MktLong({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.75, color: C.grayLt, whiteSpace: 'pre-wrap' }}>
        {value}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <CopyButton text={value} label="Copy Text" />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    in_production: [C.purple,   'IN PRODUCTION'],
    in_review:     [C.amber,    'IN REVIEW'],
    ready:         [C.green,    'READY'],
    published:     [C.purpleLt, 'PUBLISHED'],
  }
  const [color, label] = map[status] || [C.gray, status.toUpperCase()]
  return (
    <span style={{
      background:   `${color}18`,
      border:       `1px solid ${color}40`,
      color,
      borderRadius: 20,
      padding:      '3px 10px',
      fontSize:     10,
      fontWeight:   600,
      letterSpacing: '0.08em',
      fontFamily:   'monospace',
    }}>
      {label}
    </span>
  )
}
