'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setMessage('登录失败：' + error.message)
      return
    }

    router.push('/account/manage')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          display: 'flex',
          gap: '48px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* 左侧介绍 */}
        <div style={{ flex: '1 1 320px' }}>
          <h1
            style={{
              fontSize: '2.6rem',
              fontWeight: 700,
              marginBottom: '16px',
              lineHeight: 1.2,
            }}
          >
            工作后台
          </h1>
          <p style={{ fontSize: '1.05rem', opacity: 0.85, maxWidth: '420px' }}>
            记录项目进展，管理你的工作日志。
          </p>
        </div>

        {/* 右侧登录卡片 */}
        <div
          style={{
            flex: '1 1 320px',
            maxWidth: '400px',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px 28px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            账号登录
          </h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <input
                type="email"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  outline: 'none',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  outline: 'none',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: '#e85d4c',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {message && (
            <p style={{ color: '#ffb4a8', marginTop: '14px', fontSize: '0.9rem' }}>
              {message}
            </p>
          )}

          <p
            style={{
              marginTop: '20px',
              textAlign: 'center',
              fontSize: '0.85rem',
              opacity: 0.8,
            }}
          >
            <a href="/" style={{ color: '#fff' }}>
              返回首页
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}