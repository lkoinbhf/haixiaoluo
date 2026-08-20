'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LogsEditorPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/account/login')
        return
      }
      setUser({ email: data.session.user.email })
      setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/account/login')
        return
      }
      setUser({ email: session.user.email })
    })

    return () => sub.subscription.unsubscribe()
  }, [router])

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    const { error } = await supabase.from('work_logs').insert({
      title,
      content,
      is_public: isPublic,
    })

    setSaving(false)

    if (error) {
      setMessage('添加失败：' + error.message)
      return
    }

    setMessage('添加成功！')
    setTitle('')
    setContent('')
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        加载中…
      </main>
    )
  }

  const fieldStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    marginTop: '6px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.35)',
    outline: 'none',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '28px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 6px' }}>日志编辑</h1>
            <p style={{ margin: 0, opacity: 0.75, fontSize: '0.95rem' }}>
              {user?.email ? `当前账号：${user.email}` : '已登录'}
            </p>
          </div>
          <a
            href="/account/manage"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            返回控制台
          </a>
        </div>

        <form
          onSubmit={handleAddLog}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', margin: '0 0 16px' }}>新增日志</h2>

          <div style={{ marginBottom: '14px' }}>
            <label>标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label>内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              公开显示
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: '#e85d4c',
              color: '#fff',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '提交中…' : '添加日志'}
          </button>
        </form>

        {message && (
          <p
            style={{
              color: message.includes('成功') ? '#b8f5c5' : '#ffb4a8',
              marginBottom: '12px',
            }}
          >
            {message}
          </p>
        )}

        <a
          href="/tools/logs"
          style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}
        >
          查看公开日志 →
        </a>
      </div>
    </main>
  )
}