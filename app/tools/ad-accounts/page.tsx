'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { downloadExcel } from '@/lib/readTable'
import { supabase } from '@/lib/supabase'
import DarkSelect from '@/app/components/DarkSelect'


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

function todayDateString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AdAccountsPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          加载中…
        </main>
      }
    >
      <AdAccountsInner />
    </Suspense>
  )
}

function AdAccountsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
    const initialClient = searchParams.get('client') || ''
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<AdAccount[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [exportOpen])

  const [keyword, setKeyword] = useState('')
  const [port, setPort] = useState('')
  const [status, setStatus] = useState(initialClient ? '' : '待提交')
  const [client, setClient] = useState(initialClient)
  const [agency, setAgency] = useState('')
  const [bulkStatus, setBulkStatus] = useState('审核中')
  const [applied, setApplied] = useState({
    keyword: '',
    port: '',
    status: initialClient ? '' : '待提交',
    client: initialClient,
    agency: '',
  })

  const loadRows = async () => {
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
    loadRows()
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

  const bulkStatusOptions = useMemo(() => {
    if (applied.status === '待提交') return ['审核中']
    if (applied.status === '审核中') return ['成功', '失败']
    if (applied.status === '失败') return ['待提交']
    return []
  }, [applied.status])

  useEffect(() => {
    if (bulkStatusOptions.length === 0) return
    if (!bulkStatusOptions.includes(bulkStatus)) {
      setBulkStatus(bulkStatusOptions[0])
    }
    setConfirmBulk(false)
  }, [applied.status, bulkStatusOptions])

  const filtered = useMemo(() => {
    const tokens = applied.keyword
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    return rows.filter((row) => {
      if (port && row.port !== applied.port) return false
      if (status && row.whitelist_status !== applied.status) return false
      if (client && row.client_name !== applied.client) return false
      if (agency && row.agency_name !== applied.agency) return false

      if (tokens.length === 0) return true

      if (tokens.length > 1) {
        return tokens.includes(row.ad_account_id)
      }

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
  }, [rows, applied])

  const applyQuery = () => {
    setApplied({ keyword, port, status, client, agency })
    setConfirmBulk(false)
  }

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

  const exportExcel = () => {
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
    downloadExcel(`ad-accounts-${new Date().toISOString().slice(0, 10)}.xlsx`, header, body)
  }

  const requestBulkStatusUpdate = () => {
    if (filtered.length === 0 || !bulkStatus) {
      setError('当前没有可更新的记录')
      return
    }
    setError('')
    setMessage('')
    setConfirmBulk(true)
  }

  const handleBulkStatusUpdate = async () => {
    if (filtered.length === 0 || !bulkStatus) return

    setConfirmBulk(false)
    setUpdating(true)
    setMessage('')
    setError('')

    const today = todayDateString()
    const now = new Date().toISOString()

    // 需要写入开白提交日期的：原状态是待提交，且目标是审核中
    const needSubmitDateIds = filtered
      .filter((row) => row.whitelist_status === '待提交' && bulkStatus === '审核中')
      .map((row) => row.id)

    // 其余记录：只改状态
    const normalIds = filtered
      .filter((row) => !(row.whitelist_status === '待提交' && bulkStatus === '审核中'))
      .map((row) => row.id)

    let successCount = 0
    let failCount = 0
    let firstError = ''

    if (needSubmitDateIds.length > 0) {
      const { data, error } = await supabase
        .from('ad_accounts')
        .update({
          whitelist_status: bulkStatus,
          whitelist_submitted: true,
          whitelist_submitted_on: today,
          updated_at: now,
        })
        .in('id', needSubmitDateIds)
        .select('id')

      if (error) {
        failCount += needSubmitDateIds.length
        firstError = error.message
      } else {
        successCount += data?.length || 0
      }
    }

    if (normalIds.length > 0) {
      const { data, error } = await supabase
        .from('ad_accounts')
        .update({
          whitelist_status: bulkStatus,
          updated_at: now,
        })
        .in('id', normalIds)
        .select('id')

      if (error) {
        failCount += normalIds.length
        if (!firstError) firstError = error.message
      } else {
        successCount += data?.length || 0
      }
    }

    setStatus(bulkStatus)
      setApplied((prev) => ({ ...prev, status: bulkStatus }))
    await loadRows()
    setUpdating(false)

    if (failCount === 0) {
      setMessage(`已成功更新 ${successCount} 条记录为「${bulkStatus}」`)
    } else {
      setError(`成功 ${successCount} 条，失败约 ${failCount} 条。${firstError || ''}`)
    }
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="/tools/ad-accounts/import" style={ghostBtn}>
              导入
            </a>
            <a href="/account/manage" style={ghostBtn}>
              返回控制台
            </a>
          </div>
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
            marginBottom: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

          <DarkSelect label="客户" value={client} onChange={setClient} options={clientOptions} />
          <DarkSelect label="代理" value={agency} onChange={setAgency} options={agencyOptions} />
          <DarkSelect label="端口" value={port} onChange={setPort} options={PORTS} />
          <DarkSelect
            label="开白状态"
            value={status}
            onChange={(v) => {
              setStatus(v)
              setConfirmBulk(false)
            }}
            options={STATUSES}
          />

          <button
            type="button"
            onClick={applyQuery}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#e85d4c',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            查询
          </button>
          </div>

          <div ref={exportRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
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
              导出（{filtered.length}） ▾
            </button>
            {exportOpen && filtered.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  minWidth: '140px',
                  background: '#1b2744',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  zIndex: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportCsv()
                    setExportOpen(false)
                  }}
                  style={exportItem}
                >
                  导出 CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportExcel()
                    setExportOpen(false)
                  }}
                  style={exportItem}
                >
                  导出 Excel
                </button>
              </div>
            )}
          </div>
        </div>

        {applied.status && applied.status != '成功' &&(
          <>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <span style={{ opacity: 0.9, fontSize: '0.95rem' }}>
                批量修改当前结果（{filtered.length} 条）的开白状态为
              </span>
              <DarkSelect
                label="目标状态"
                value={bulkStatus}
                onChange={setBulkStatus}
                options={bulkStatusOptions}
                hideAllOption
              />
              <button
                type="button"
                onClick={requestBulkStatusUpdate}
                disabled={filtered.length === 0 || updating}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#e85d4c',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: filtered.length === 0 || updating ? 'not-allowed' : 'pointer',
                  opacity: filtered.length === 0 || updating ? 0.6 : 1,
                }}
              >
                {updating ? '更新中…' : '一键应用'}
              </button>
            </div>

            {confirmBulk && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(232,93,76,0.15)',
                  border: '1px solid rgba(232,93,76,0.45)',
                }}
              >
                <p style={{ margin: '0 0 12px' }}>
                  确定把当前 <strong>{filtered.length}</strong> 条记录的开白状态改为「
                  {bulkStatus}」吗？
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleBulkStatusUpdate}
                    disabled={updating}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#e85d4c',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    确认修改
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulk(false)}
                    disabled={updating}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.35)',
                      background: 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {message && <p style={{ color: '#b8f5c5' }}>{message}</p>}
        {error && <p style={{ color: '#ffb4a8' }}>{error.startsWith('成功') ? error : `加载/更新失败：${error}`}</p>}
        {loading && <p style={{ opacity: 0.75 }}>读取中…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ opacity: 0.75 }}>没有符合条件的记录。</p>
        )}

{!loading && filtered.length > 0 && (
          <div
            style={{
              overflow: 'auto',
              maxHeight: '480px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.18)',
            }}
          >
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
                        position: 'sticky',
                        top: 0,
                        background: '#16213e',
                        zIndex: 1,
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

const exportItem: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  border: 'none',
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
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