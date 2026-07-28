'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('登录失败：' + error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase.from('work_logs').insert({
      title,
      content,
      is_public: isPublic,
    })
    if (error) {
      setMessage('添加失败：' + error.message)
    } else {
      setMessage('添加成功！')
      setTitle('')
      setContent('')
      router.refresh()
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>加载中...</div>
  }

  if (!user) {
    return (
      <main style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: 'system-ui' }}>
        <h1 style={{ marginBottom: 24 }}>管理登录</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            />
          </div>
          <button type="submit" style={{ padding: '8px 16px' }}>登录</button>
        </form>
        {message && <p style={{ color: 'red', marginTop: 16 }}>{message}</p>}
        <p style={{ marginTop: 40 }}>
          <a href="/" style={{ color: '#0070f3' }}>← 返回首页</a>
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 20, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1>工作日志管理</h1>
        <button onClick={handleLogout} style={{ padding: '6px 12px' }}>退出登录</button>
      </div>

      <p style={{ marginBottom: 24, color: '#666' }}>
        当前登录：{user.email}
      </p>

      <form onSubmit={handleAddLog} style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>新增日志</h2>
        <div style={{ marginBottom: 12 }}>
          <label>标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />{' '}
            公开显示
          </label>
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>添加日志</button>
      </form>

      {message && <p style={{ color: message.includes('成功') ? 'green' : 'red' }}>{message}</p>}

      <p>
        <a href="/logs" style={{ color: '#0070f3' }}>查看工作日志 →</a>
      </p>
    </main>
  )
}