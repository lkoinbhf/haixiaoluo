'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type SessionUser = {
  email?: string
}

export default function AccountManagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/account/login')
        return
      }
      setUser({ email: data.session.user.email })
      setLoading(false)
    }
    check()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/account/login')
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

  const cards = [
    {
      title: '工作日志',
      desc: '查看或管理项目日志',
      href: '/tools/logs',
    },
    {
      title: '接码工具',
      desc: '按口令解锁号码并获取短信',
      href: '/tools/sms',
    },
    {
      title: '日志编辑',
      desc: '添加、编辑、删除工作日志',
      href: '/tools/logs/editor',
    },
    {
      title: '广告户',
      desc: '查询并导出广告户资料',
      href: '/tools/ad-accounts',
    },
  ]

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
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 6px' }}>控制台</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.95rem' }}>
              {user?.email ? `已登录：${user.email}` : '已登录'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href="/"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              首页
            </a>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              退出登录
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
          }}
        >
          {cards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              style={{
                display: 'block',
                padding: '20px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
                {card.title}
              </div>
              <div style={{ opacity: 0.8, lineHeight: 1.5, fontSize: '0.95rem' }}>
                {card.desc}
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}