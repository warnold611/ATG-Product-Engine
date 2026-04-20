'use client'
import { useState } from 'react'
import { C } from '@/lib/colors'

interface CopyButtonProps {
  text: string
  label?: string
  small?: boolean
}

export function CopyButton({ text, label = 'Copy', small = false }: CopyButtonProps) {
  const [done, setDone] = useState(false)

  const go = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }

  return (
    <button
      onClick={go}
      style={{
        background:   done ? C.green : 'transparent',
        border:       `1px solid ${done ? C.green : C.border}`,
        color:        done ? C.bg : C.grayLt,
        borderRadius: 6,
        padding:      small ? '3px 10px' : '5px 14px',
        fontSize:     small ? 11 : 12,
        cursor:       'pointer',
        transition:   'all 0.2s',
        fontFamily:   'monospace',
        whiteSpace:   'nowrap',
        flexShrink:   0,
      }}
    >
      {done ? '✓ Copied' : label}
    </button>
  )
}
