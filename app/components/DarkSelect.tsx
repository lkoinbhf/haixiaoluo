'use client'

import { useEffect, useRef, useState } from 'react'

export default function DarkSelect({
  label,
  value,
  onChange,
  options,
  hideAllOption = false,
  minWidth = '140px'
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  hideAllOption?: boolean
  minWidth?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const list = hideAllOption ? options : ['', ...options]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth, width: minWidth }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
      >
        <span style={{ color: value ? '#e85d4c' : '#fff', fontWeight: value ? 600 : 400 }}>
          {value || (hideAllOption ? label : `全部${label}`)}
        </span>
        <span style={{ opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={menuStyle}>
          {list.map((opt) => {
            const active = value === opt
            return (
              <button
                key={opt || '__all'}
                type="button"
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: 'none',
                  background: active ? 'rgba(232,93,76,0.35)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {opt || `全部${label}`}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const triggerStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(0,0,0,0.25)',
  color: '#fff',
  outline: 'none',
  width: '100%',
  textAlign: 'left',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  zIndex: 20,
  background: '#1b2744',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
  maxHeight: '240px',
  overflowY: 'auto',
}