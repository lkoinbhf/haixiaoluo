'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HomeNav() {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      setEmail(data.session?.user.email ?? null)
      setReady(true)
    }
    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
      setReady(true)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const linkStyle = {
    color: '#fff',
    textDecoration: 'none',
    opacity: 0.9,
  } as const

  return (
    <nav
      style={{
        display: 'flex',
        gap: '20px',
        fontSize: '0.95rem',
        alignItems: 'center',
      }}
    >

      {!ready ? (
        <span style={{ opacity: 0.5 }}>…</span>
      ) : email ? (
        <span
          title={email}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.28)',
            background: 'rgba(255,255,255,0.1)',
            fontSize: '0.88rem',
            opacity: 0.95,
            cursor: 'default',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            const tip = e.currentTarget.querySelector('[data-tip]') as HTMLElement | null
            if (tip) tip.style.opacity = '1'
          }}
          onMouseLeave={(e) => {
            const tip = e.currentTarget.querySelector('[data-tip]') as HTMLElement | null
            if (tip) tip.style.opacity = '0'
          }}
        >
          <span aria-hidden="true">✓</span>
          <span>已登录</span>
          <span
            data-tip
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.85)',
              color: '#fff',
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.15s ease',
              zIndex: 10,
            }}
          >
            {email}
          </span>
        </span>
      ) : (
        <a href="/account/login" style={linkStyle}>
          登录
        </a>
      )}
    </nav>
  )
}