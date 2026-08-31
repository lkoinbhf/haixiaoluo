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
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/account/login')
        return
      }
      setUser({ email: data.session.user.email })
      setLoading(false)

      const { count, error } = await supabase
        .from('ad_accounts')
        .select('id', { count: 'exact', head: true })
        .in('whitelist_status', ['待提交', '审核中'])

      if (!error) setPendingCount(count ?? 0)
      else setPendingCount(0)
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

  const toolCards = [
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
  ]

  const cardStyle: React.CSSProperties = {
    display: 'block',
    padding: '20px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    textDecoration: 'none',
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
            marginBottom: '28px',
          }}
        >
          {toolCards.map((card) => (
            <a key={card.href} href={card.href} style={cardStyle}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
                {card.title}
              </div>
              <div style={{ opacity: 0.8, lineHeight: 1.5, fontSize: '0.95rem' }}>
                {card.desc}
              </div>
            </a>
          ))}
        </div>

        <section>
          {pendingCount !== null && pendingCount > 0 && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(232,93,76,0.16)',
                border: '1px solid rgba(232,93,76,0.45)',
                lineHeight: 1.6,
                fontSize: '0.95rem',
              }}
            >
              当前还有「{pendingCount}」条广告户待提交开白或更新开白状态，请尽快处理！
            </div>
          )}
          {pendingCount === 0 && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                lineHeight: 1.6,
                fontSize: '0.95rem',
                opacity: 0.85,
              }}
            >
              当前没有待提交或审核中的广告户。
            </div>
          )}

<div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <a href="/tools/ad-accounts" style={cardStyle}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
                广告户
              </div>
              <div style={{ opacity: 0.8, lineHeight: 1.5, fontSize: '0.95rem' }}>
                查询并导出广告户资料
              </div>
            </a>
            
            <a href="/tools/clients" style={cardStyle}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
                客户
              </div>
              <div style={{ opacity: 0.8, lineHeight: 1.5, fontSize: '0.95rem' }}>
                查看客户与支付主体
              </div>
            </a>

            <a href="/tools/funds" style={cardStyle}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
                资金流水
              </div>
              <div style={{ opacity: 0.8, lineHeight: 1.5, fontSize: '0.95rem' }}>
                导入客户打款与代理充值记录
              </div>
            </a>

          </div>
        </section>
      </div>
    </main>
  )
}