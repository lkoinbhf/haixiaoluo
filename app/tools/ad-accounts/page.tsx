'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AdAccount = {
  id: number
  ad_account_id: string
  ad_account_name: string
  client_name: string | null
  agency_name: string | null
  port: string
  opened_on: string
  whitelist_submitted: boolean
  whitelist_submitted_on: string | null
  whitelist_status: string
}

const PORTS = ['泰国', '日本', '巴西', '中国', '马来', '越南']
const STATUSES = ['待提交', '审核中', '成功', '失败']

export default function AdAccountsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<AdAccount[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [keyword, setKeyword] = useState('')
  const [port, setPort] = useState('')
  const [status, setStatus] = useState('')
  const [client, setClient] = useState('')
  const [agency, setAgency] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/account/login')
        return
      }
      setReady(true)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!ready) return
    const load = async () => {
      setLoading(true)
      setError('')
      const { data, error } = await supabase
        .from('ad_accounts')
        .select(
          'id, ad_account_id, ad_account_name, client_name, agency_name, port, opened_on, whitelist_submitted, whitelist_submitted_on, whitelist_status'
        )
        .order('opened_on', { ascending: false })

      if (error) setError(error.message)
      setRows((data as AdAccount[]) || [])
      setLoading(false)
    }
    load()
  }, [ready])

  const clientOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.client_name).filter(Boolean) as string[])).sort(),
    [rows]
  )
  const agencyOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.agency_name).filter(Boolean) as string[])).sort(),
    [rows]
  )

  const filtered = useMemo(() => {
    const tokens = keyword
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    return rows.filter((row) => {
      if (port && row.port !== port) return false
      if (status && row.whitelist_status !== status) return false
      if (client && row.client_name !== client) return false
      if (agency && row.agency_name !== agency) return false

      if (tokens.length === 0) return true

      // 多个关键词：只按广告户 ID 批量匹配
      if (tokens.length > 1) {
        return tokens.includes(row.ad_account_id)
      }

      // 单个关键词：仍可搜 ID / 名字 / 客户 / 代理
      const q = tokens[0].toLowerCase()
      const blob = [
        row.ad_account_id,
        row.ad_account_name,
        row.client_name,
        row.agency_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [rows, keyword, port, status, client, agency])

  const exportCsv = () => {
    const header = [
      '广告户ID',
      '广告户名字',
      '客户',
      '代理',
      '端口',
      '开户日期',
      '是否已提交开白',
      '开白提交日期',
      '开白状态',
    ]
    const body = filtered.map((row) => [
      row.ad_account_id,
      row.ad_account_name,
      row.client_name || '',
      row.agency_name || '',
      row.port,
      row.opened_on,
      row.whitelist_submitted ? '是' : '否',
      row.whitelist_submitted_on || '',
      row.whitelist_status,
    ])

    const csv = [header, ...body]
      .map((line) =>
        line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ad-accounts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!ready) {
    return (
      <main style={pageStyle}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          加载中…
        </div>
      </main>
    )
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem' }}>广告户</h1>
            <p style={{ margin: 0, opacity: 0.75 }}>查询与导出广告户基础资料</p>
          </div>
          <a href="/account/manage" style={ghostBtn}>
            返回控制台
          </a>
        </div>

        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索名字，或批量粘贴广告户ID（逗号/空格分隔）"
          style={{
            ...inputStyle,
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: '12px',
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '16px',
            alignItems: 'center',
          }}
        >
          <DarkSelect
            label="客户"
            value={client}
            onChange={setClient}
            options={clientOptions}
          />
          <DarkSelect
            label="代理"
            value={agency}
            onChange={setAgency}
            options={agencyOptions}
          />
          <DarkSelect label="端口" value={port} onChange={setPort} options={PORTS} />
          <DarkSelect
            label="开白状态"
            value={status}
            onChange={setStatus}
            options={STATUSES}
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#e85d4c',
              color: '#fff',
              fontWeight: 600,
              cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filtered.length === 0 ? 0.6 : 1,
            }}
          >
            导出 CSV（{filtered.length}）
          </button>
        </div>

        {error && <p style={{ color: '#ffb4a8' }}>加载失败：{error}</p>}
        {loading && <p style={{ opacity: 0.75 }}>读取中…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ opacity: 0.75 }}>没有符合条件的记录。</p>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <thead>
                <tr>
                  {[
                    '广告户ID',
                    '广告户名字',
                    '客户',
                    '代理',
                    '端口',
                    '开户日期',
                    '已提交开白',
                    '开白提交日期',
                    '开白状态',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 8px',
                        borderBottom: '1px solid rgba(255,255,255,0.2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.ad_account_id}</td>
                    <td style={td}>{row.ad_account_name}</td>
                    <td style={td}>{row.client_name || '-'}</td>
                    <td style={td}>{row.agency_name || '-'}</td>
                    <td style={td}>{row.port}</td>
                    <td style={td}>{row.opened_on}</td>
                    <td style={td}>{row.whitelist_submitted ? '是' : '否'}</td>
                    <td style={td}>{row.whitelist_submitted_on || '-'}</td>
                    <td style={td}>{row.whitelist_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

function DarkSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative', minWidth: '140px' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...inputStyle,
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span>{value || `全部${label}`}</span>
        <span style={{ opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          style={{
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
          }}
        >
          {['', ...options].map((opt) => {
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

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  color: '#fff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: '24px',
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff',
  textDecoration: 'none',
  height: 'fit-content',
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(0,0,0,0.25)',
  color: '#fff',
  outline: 'none',
}

const td: React.CSSProperties = {
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
}