'use client'
import { useState } from 'react'
import { C } from '@/lib/colors'

interface PinLockProps {
  onUnlock: (token: string) => void
}

export function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (p: string) => {
    if (p.length < 4) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: p }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('atg_session', data.token)
        onUnlock(data.token)
      } else {
        setError(data.error || 'Incorrect PIN')
        setPin('')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const handleDigit = (d: string) => {
    const next = pin + d
    setPin(next)
    if (next.length >= 6) submit(next)
    else if (next.length === 4) {
      // Try 4-digit immediately
      setTimeout(() => submit(next), 100)
    }
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     C.bg,
      flexDirection:  'column',
      gap:            32,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width:        64,
          height:       64,
          background:   `linear-gradient(135deg, ${C.purple}, ${C.purpleLt})`,
          borderRadius: 16,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontWeight:   900,
          fontSize:     28,
          color:        C.white,
          margin:       '0 auto 16px',
        }}>A</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.06em', color: C.white }}>
          ATG PRODUCT ENGINE
        </div>
        <div style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>
          Arnold Trading Group
        </div>
      </div>

      {/* PIN input */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: C.grayLt, marginBottom: 20, letterSpacing: '0.06em' }}>
          ENTER PIN
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width:        14,
              height:       14,
              borderRadius: '50%',
              background:   i < pin.length ? C.purple : 'transparent',
              border:       `2px solid ${i < pin.length ? C.purple : C.grayDk}`,
              transition:   'all 0.15s',
            }} />
          ))}
        </div>

        {error && (
          <div style={{
            color:        '#FCA5A5',
            fontSize:     13,
            marginBottom: 16,
            padding:      '8px 16px',
            background:   C.redDm,
            borderRadius: 8,
            border:       `1px solid ${C.red}40`,
          }}>
            {error}
          </div>
        )}

        {/* Keypad */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 10,
          maxWidth:            240,
          margin:              '0 auto',
        }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => {
            if (d === '') return <div key={i} />
            return (
              <button
                key={d}
                onClick={() => d === '⌫' ? handleDelete() : handleDigit(d)}
                disabled={loading}
                style={{
                  height:       60,
                  background:   C.surf2,
                  border:       `1px solid ${C.border}`,
                  borderRadius: 12,
                  color:        d === '⌫' ? C.gray : C.white,
                  fontSize:     d === '⌫' ? 18 : 22,
                  fontWeight:   500,
                  cursor:       loading ? 'not-allowed' : 'pointer',
                  transition:   'all 0.1s',
                }}
              >
                {loading && d !== '⌫' ? '' : d}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.grayDk, fontFamily: 'monospace' }}>
        Internal tool — Arnold Trading Group
      </div>
    </div>
  )
}
