'use client'

import { useEffect, useRef, useState } from 'react'

type SmsNumber = {
  id: number
  phone_number: string
  label: string | null
}

export default function SmsToolPage() {
  const [passphrase, setPassphrase] = useState('')
  const [token, setToken] = useState('')
  const [groupName, setGroupName] = useState('')
  const [numbers, setNumbers] = useState<SmsNumber[]>([])
  const [selected, setSelected] = useState<string>('')
  const [listOpen, setListOpen] = useState(true)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingVerify, setLoadingVerify] = useState(false)

  const [polling, setPolling] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [smsResult, setSmsResult] = useState('')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPolling(false)
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSmsResult('')
    setSelected('')
    stopPolling()
    setLoadingVerify(true)

    try {
      const res = await fetch('/api/tools/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      })
      const data = await res.json()

      if (!res.ok) {
        setToken('')
        setNumbers([])
        setGroupName('')
        setError(data.error || '校验失败')
        return
      }

      setToken(data.token)
      setGroupName(data.groupName || '已解锁')
      setNumbers(data.numbers || [])
      setListOpen(true)
      setMessage(`解锁成功，共 ${data.numbers?.length || 0} 个号码`)
      setPassphrase('')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoadingVerify(false)
    }
  }

  const acquireNumber = async () => {
    const res = await fetch('/api/tools/sms/acquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        phoneNumber: selected,
      }),
    })
    const data = await res.json()
    return { ok: res.ok, data }
  }

  const fetchCodeOnce = async (): Promise<{ done: boolean }> => {
    const res = await fetch('/api/tools/sms/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        phoneNumber: selected,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '获取失败')
      stopPolling()
      return { done: true }
    }

    // 0：成功
    if (data.status === '0') {
      setSmsResult(data.content || data.raw || '已收到短信')
      setMessage('成功获取短信')
      stopPolling()
      return { done: true }
    }

    // 1：未收到，继续轮询
    if (data.status === '1') {
      setMessage(`尚未收到短信（第 ${pollCountRef.current} / 20 次）`)
      return { done: false }
    }

    // 2：超时或已释放 → 尝试占用一次
    if (data.status === '2') {
      setMessage('号码已释放，正在重新占用…')
      const acquire = await acquireNumber()

      if (!acquire.ok) {
        setError(
          acquire.data?.error ||
            acquire.data?.raw ||
            '号码已被占用，请稍后获取'
        )
        stopPolling()
        return { done: true }
      }

      setMessage('重新占用成功，继续等待短信…')
      // 不结束，下一轮继续 code
      return { done: false }
    }

    // 其他错误
    setError(data.content || data.raw || '获取失败')
    stopPolling()
    return { done: true }
  }

  const handleStartPoll = async () => {
    if (!selected || !token) return

    setError('')
    setSmsResult('')
    setMessage('开始获取短信…')
    setPolling(true)
    pollCountRef.current = 1
    setPollCount(1)

    try {
      // 第一个动作就是 code（不先 getphone）
      const first = await fetchCodeOnce()
      if (first.done) return

      timerRef.current = setInterval(async () => {
        pollCountRef.current += 1
        setPollCount(pollCountRef.current)

        if (pollCountRef.current > 20) {
          setMessage('已达到最大尝试次数（20 次），请稍后再试')
          stopPolling()
          return
        }

        const result = await fetchCodeOnce()
        if (result.done) return
      }, 5000)
    } catch {
      setError('网络错误，请稍后重试')
      stopPolling()
    }
  }
  
  const handleSelect = (phone: string) => {
    if (polling) stopPolling()
    setSelected(phone)
    setSmsResult('')
    setError('')
    setMessage('')
    setPollCount(0)
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
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
            ← 返回首页
          </a>
        </div>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>接码工具</h1>
        <p style={{ opacity: 0.8, marginBottom: '24px' }}>
          输入口令后选择号码，获取短信验证码
        </p>

        {/* 口令区 */}
        {!token && (
          <form
            onSubmit={handleVerify}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '16px',
            }}
          >
            <label style={{ display: 'block', marginBottom: '8px' }}>口令</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.35)',
                outline: 'none',
                marginBottom: '14px',
                fontSize: '1rem',
              }}
            />
            <button
              type="submit"
              disabled={loadingVerify}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: '#e85d4c',
                color: '#fff',
                fontWeight: 600,
                cursor: loadingVerify ? 'not-allowed' : 'pointer',
                opacity: loadingVerify ? 0.7 : 1,
              }}
            >
              {loadingVerify ? '验证中…' : '解锁'}
            </button>
          </form>
        )}

        {/* 已解锁 */}
        {token && (
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <strong>{groupName || '当前分组'}</strong>
              <button
                type="button"
                onClick={() => {
                  stopPolling()
                  setToken('')
                  setNumbers([])
                  setSelected('')
                  setSmsResult('')
                  setMessage('')
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                退出
              </button>
            </div>

            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '10px',
                padding: '12px',
                cursor: 'pointer',
                marginBottom: listOpen ? '10px' : 0,
              }}
            >
              {listOpen ? '收起号码列表 ▲' : `展开号码列表（${numbers.length}）▼`}
              {selected ? `　已选：${selected}` : ''}
            </button>

            {listOpen && (
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {numbers.length === 0 && (
                  <div style={{ padding: '12px', opacity: 0.75 }}>该组暂无号码</div>
                )}
                {numbers.map((n) => {
                  const active = selected === n.phone_number
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelect(n.phone_number)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        background: active ? 'rgba(232,93,76,0.35)' : 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{n.phone_number}</div>
                      {n.label && (
                        <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>{n.label}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {selected && (
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleStartPoll}
                  disabled={polling}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: polling ? '#666' : '#e85d4c',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: polling ? 'not-allowed' : 'pointer',
                  }}
                >
                  {polling ? `获取中… ${pollCount}/20` : '获取短信'}
                </button>
                {polling && (
                  <button
                    type="button"
                    onClick={stopPolling}
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    停止
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {message && (
          <p style={{ color: '#b8f5c5', marginBottom: '8px' }}>{message}</p>
        )}
        {error && (
          <p style={{ color: '#ffb4a8', marginBottom: '8px' }}>{error}</p>
        )}
        {smsResult && (
          <div
            style={{
              marginTop: '12px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.15)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.5,
            }}
          >
            <div style={{ opacity: 0.75, marginBottom: '6px', fontSize: '0.85rem' }}>
              短信内容
            </div>
            {smsResult}
          </div>
        )}
      </div>
    </main>
  )
}