'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/colors'

const NICHE_OPTIONS = [
  'Prop firm trading (FTMO, TopStep, Apex, MFF)',
  'Futures day trading (/NQ, /ES, /CL)',
  'Options trading (0DTE, spreads, retail)',
  'Day trading psychology',
  'Risk management & position sizing',
  'Swing trading',
  'Crypto trading',
]

const SESSION_OPTIONS = [
  { value: 1,  label: '1 hour' },
  { value: 4,  label: '4 hours' },
  { value: 24, label: '24 hours' },
  { value: 0,  label: 'Until closed' },
]

export default function SettingsPage() {
  const router = useRouter()

  const [loading,  setLoading]          = useState(true)
  const [saving,   setSaving]           = useState(false)
  const [saved,    setSaved]            = useState(false)

  // PIN state
  const [pinEnabled,    setPinEnabled]  = useState(false)
  const [newPin,        setNewPin]      = useState('')
  const [confirmPin,    setConfirmPin]  = useState('')
  const [currentPin,    setCurrentPin]  = useState('')
  const [pinMsg,        setPinMsg]      = useState('')
  const [savingPin,     setSavingPin]   = useState('')
  const [sessionHours,  setSessionHours] = useState(4)

  // Brand
  const [brandVoice,       setBrandVoice]       = useState('')
  const [atgPhilosophy,    setAtgPhilosophy]    = useState('')
  const [tradingBg,        setTradingBg]        = useState('')
  const [niche,            setNiche]            = useState<string[]>([])
  const [priceRange,       setPriceRange]       = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ settings: s }) => {
        setPinEnabled(s.pin_enabled ?? false)
        setSessionHours(s.pin_session_hours ?? 4)
        setBrandVoice(s.brand_voice ?? '')
        setAtgPhilosophy(s.atg_philosophy ?? '')
        setTradingBg(s.trading_background ?? '')
        setNiche(s.niche_focus ?? [])
        setPriceRange(s.default_price_range ?? '')
        setLoading(false)
      })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin_enabled:        pinEnabled,
        pin_session_hours:  sessionHours,
        brand_voice:        brandVoice,
        atg_philosophy:     atgPhilosophy,
        trading_background: tradingBg,
        niche_focus:        niche,
        default_price_range: priceRange,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const setPin = async () => {
    if (newPin.length < 4) return setPinMsg('PIN must be 4-6 digits')
    if (newPin !== confirmPin) return setPinMsg('PINs do not match')
    setSavingPin('Setting PIN…')
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: newPin, action: 'set_pin' }),
    })
    const d = await res.json()
    if (d.success) {
      if (d.token) localStorage.setItem('atg_session', d.token)
      setPinEnabled(true)
      setPinMsg('✓ PIN set successfully')
      setNewPin('')
      setConfirmPin('')
    } else {
      setPinMsg(d.error || 'Failed to set PIN')
    }
    setSavingPin('')
  }

  const clearPin = async () => {
    if (!currentPin) return setPinMsg('Enter current PIN to disable')
    setSavingPin('Disabling…')
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: currentPin, action: 'clear_pin' }),
    })
    const d = await res.json()
    if (d.success) {
      setPinEnabled(false)
      setPinMsg('✓ PIN disabled')
      setCurrentPin('')
      localStorage.removeItem('atg_session')
    } else {
      setPinMsg(d.error || 'Failed')
    }
    setSavingPin('')
  }

  const toggleNiche = (n: string) => {
    setNiche(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surf, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.grayLt, borderRadius: 7, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
            ← Dashboard
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Settings</span>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{ background: saved ? C.green : C.purple, color: C.white, border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>

        {/* Brand Voice */}
        <Section title="Brand Voice & Identity">
          <FieldBlock label="ATG PHILOSOPHY" hint="Core mission and approach of Arnold Trading Group">
            <textarea
              value={atgPhilosophy}
              onChange={e => setAtgPhilosophy(e.target.value)}
              placeholder="e.g. We believe every trader deserves straight-talk education built on real experience — no fluff, no guru BS, just what actually works in live markets."
              rows={3}
              style={textareaStyle}
            />
          </FieldBlock>

          <FieldBlock label="TRADING BACKGROUND" hint="Your experience and credentials — injected into every generation prompt">
            <textarea
              value={tradingBg}
              onChange={e => setTradingBg(e.target.value)}
              placeholder="e.g. 7+ years trading NQ and ES futures, 2 years prop firm trading with TopStep and Apex. Consistently profitable on 6-figure accounts."
              rows={3}
              style={textareaStyle}
            />
          </FieldBlock>

          <FieldBlock label="BRAND VOICE" hint="How ATG content should sound — injected as writing instructions">
            <textarea
              value={brandVoice}
              onChange={e => setBrandVoice(e.target.value)}
              placeholder="e.g. Direct trader-to-trader tone. No corporate speak. Specific examples, real numbers. Call out what actually fails and why. No coddling."
              rows={3}
              style={textareaStyle}
            />
          </FieldBlock>
        </Section>

        {/* Niche Focus */}
        <Section title="Niche Focus">
          <p style={{ fontSize: 13, color: C.gray, marginBottom: 14, lineHeight: 1.6 }}>
            Select the trading niches ATG focuses on. These guide idea generation toward your audience.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NICHE_OPTIONS.map(n => (
              <div
                key={n}
                onClick={() => toggleNiche(n)}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        12,
                  padding:    '10px 14px',
                  background: niche.includes(n) ? `${C.purple}18` : C.surf2,
                  border:     `1px solid ${niche.includes(n) ? C.purple : C.border}`,
                  borderRadius: 8,
                  cursor:     'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${niche.includes(n) ? C.purple : C.grayDk}`, background: niche.includes(n) ? C.purple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.white, flexShrink: 0 }}>
                  {niche.includes(n) ? '✓' : ''}
                </div>
                <span style={{ fontSize: 13, color: niche.includes(n) ? C.white : C.grayLt }}>{n}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Pricing */}
        <Section title="Default Pricing">
          <FieldBlock label="DEFAULT PRICE RANGE" hint="Used as guidance during idea generation">
            <input
              value={priceRange}
              onChange={e => setPriceRange(e.target.value)}
              placeholder="e.g. $17-$47 for ebooks, $97-$197 for full courses"
              style={inputStyle}
            />
          </FieldBlock>
        </Section>

        {/* PIN System */}
        <Section title="PIN Lock">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 14px', background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 13, color: C.white, fontWeight: 500 }}>PIN Protection</div>
              <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>Require a PIN to access the app</div>
            </div>
            <div style={{
              width:        44,
              height:       24,
              borderRadius: 12,
              background:   pinEnabled ? C.purple : C.grayDk,
              position:     'relative',
              cursor:       'pointer',
              transition:   'all 0.2s',
            }} onClick={() => !pinEnabled && setPinEnabled(true)}>
              <div style={{ width: 18, height: 18, background: C.white, borderRadius: '50%', position: 'absolute', top: 3, left: pinEnabled ? 23 : 3, transition: 'left 0.2s' }} />
            </div>
          </div>

          {pinEnabled && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {SESSION_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setSessionHours(o.value)}
                  style={{
                    flex:       1,
                    background: sessionHours === o.value ? C.purple : C.surf2,
                    border:     `1px solid ${sessionHours === o.value ? C.purple : C.border}`,
                    color:      sessionHours === o.value ? C.white : C.grayLt,
                    borderRadius: 7,
                    padding:    '8px 4px',
                    fontSize:   11,
                    cursor:     'pointer',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {pinMsg && (
            <div style={{ fontSize: 12, color: pinMsg.startsWith('✓') ? C.green : '#FCA5A5', padding: '8px 12px', background: pinMsg.startsWith('✓') ? `${C.green}10` : C.redDm, border: `1px solid ${pinMsg.startsWith('✓') ? C.green + '40' : C.red + '40'}`, borderRadius: 8, marginBottom: 12 }}>
              {pinMsg}
            </div>
          )}

          {!pinEnabled ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="New PIN (4-6 digits)" type="password" inputMode="numeric" style={inputStyle} />
              <input value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Confirm PIN" type="password" inputMode="numeric" style={inputStyle} />
              <button onClick={setPin} disabled={!!savingPin} style={{ background: C.purple, color: C.white, border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {savingPin || 'Set PIN'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 10 }}>To disable PIN, enter your current PIN:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Current PIN" type="password" inputMode="numeric" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={clearPin} disabled={!!savingPin} style={{ background: C.redDm, color: '#FCA5A5', border: `1px solid ${C.red}40`, borderRadius: 8, padding: '0 16px', fontSize: 12, cursor: 'pointer' }}>
                  {savingPin || 'Disable'}
                </button>
              </div>
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: C.purpleLt, fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: C.gray, marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  )
}

const textareaStyle: React.CSSProperties = {
  width:        '100%',
  background:   '#13131E',
  border:       `1px solid #1E1E30`,
  borderRadius: 8,
  padding:      '10px 12px',
  color:        '#F0F0F8',
  fontSize:     13,
  lineHeight:   1.65,
  resize:       'vertical' as const,
  fontFamily:   'inherit',
  outline:      'none',
}

const inputStyle: React.CSSProperties = {
  width:        '100%',
  background:   '#13131E',
  border:       `1px solid #1E1E30`,
  borderRadius: 8,
  padding:      '10px 12px',
  color:        '#F0F0F8',
  fontSize:     13,
  fontFamily:   'inherit',
  outline:      'none',
}
