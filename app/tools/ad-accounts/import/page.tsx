'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type DraftRow = {
  ad_account_id: string
  ad_account_name: string
  client_name: string
  agency_name: string
  port: string
  opened_on: string
  whitelist_submitted: boolean
  whitelist_submitted_on: string | null
  whitelist_status: string
  error?: string
  exists?: boolean
}

const PORTS = ['泰国', '日本', '巴西', '中国', '马来', '越南']
const STATUSES = ['待提交', '审核中', '成功', '失败']

const REQUIRED_HEADERS = ['广告户ID', '广告户名字'] as const
const OPTIONAL_HEADERS = [
  '客户',
  '代理',
  '端口',
  '开户日期',
  '是否已提交开白',
  '开白提交日期',
  '开白状态',
] as const
const KNOWN_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    const next = src[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n') {
      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim())
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c !== ''))
}

function normalizeHeader(value: string) {
  return value.replace(/\s/g, '').replace(/^="/, '').replace(/"$/, '')
}

function cleanId(value: string) {
  return value.replace(/^="/, '').replace(/"$/, '').trim()
}

function toDate(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const m = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function toBool(value: string, status: string) {
  const v = value.trim()
  if (v === '是' || v.toLowerCase() === 'true') return true
  if (v === '否' || v.toLowerCase() === 'false') return false
  return status !== '待提交'
}

export default function AdAccountsImportPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [headerIndex, setHeaderIndex] = useState<Record<string, number>>({})
  const [ignoredHeaders, setIgnoredHeaders] = useState<string[]>([])
  const [missingHeaders, setMissingHeaders] = useState<string[]>([])
  const [fileError, setFileError] = useState('')

  const [fillClient, setFillClient] = useState('')
  const [fillAgency, setFillAgency] = useState('')
  const [fillPort, setFillPort] = useState('')
  const [fillOpenedOn, setFillOpenedOn] = useState('')
  const [fillSubmitted, setFillSubmitted] = useState('')
  const [fillSubmittedOn, setFillSubmittedOn] = useState('')
  const [fillStatus, setFillStatus] = useState('待提交')

  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [clientNames, setClientNames] = useState<string[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.replace('/account/login')
        return
      }
      setReady(true)
      const { data: clientData } = await supabase.from('clients').select('name')
      setClientNames((clientData || []).map((c: { name: string }) => c.name))
    }
    init()
  }, [router])

  const handleFile = async (file: File) => {
    setMessage('')
    setError('')
    setFileError('')
    setDrafts([])

    const text = await file.text()
    const table = parseCsv(text)
    if (table.length < 2) {
      setFileError('CSV 内容为空，或缺少表头')
      setRawRows([])
      return
    }

    const headers = table[0].map(normalizeHeader)
    const indexMap: Record<string, number> = {}
    const ignored: string[] = []

    headers.forEach((h, i) => {
      if (KNOWN_HEADERS.includes(h as (typeof KNOWN_HEADERS)[number])) {
        indexMap[h] = i
      } else if (h) {
        ignored.push(h)
      }
    })

    const missingRequired = REQUIRED_HEADERS.filter((h) => indexMap[h] === undefined)
    if (missingRequired.length > 0) {
      setFileError(`文件缺少必须列：${missingRequired.join('、')}`)
      setRawRows([])
      return
    }

    const missingOptional = OPTIONAL_HEADERS.filter((h) => indexMap[h] === undefined)

    setHeaderIndex(indexMap)
    setIgnoredHeaders(ignored)
    setMissingHeaders(missingOptional)
    setRawRows(table.slice(1))
    setFillClient('')
    setFillAgency('')
    setFillPort('')
    setFillOpenedOn('')
    setFillSubmitted('')
    setFillSubmittedOn('')
    setFillStatus('待提交')
  }

  const buildDrafts = async () => {
    setError('')
    setMessage('')

    const parsed: DraftRow[] = rawRows.map((cols) => {
      const get = (name: string) => {
        const i = headerIndex[name]
        return i === undefined ? '' : cleanId(cols[i] || '')
      }

      const whitelist_status = get('开白状态') || fillStatus || '待提交'
      const opened_on = toDate(get('开户日期')) || fillOpenedOn || ''
      const submittedOn = toDate(get('开白提交日期')) || fillSubmittedOn || null
      const submittedRaw = get('是否已提交开白') || fillSubmitted

      const row: DraftRow = {
        ad_account_id: get('广告户ID'),
        ad_account_name: get('广告户名字'),
        client_name: get('客户') || fillClient,
        agency_name: get('代理') || fillAgency,
        port: get('端口') || fillPort,
        opened_on,
        whitelist_status,
        whitelist_submitted: toBool(submittedRaw, whitelist_status),
        whitelist_submitted_on: submittedOn || null,
      }

      const problems: string[] = []
      if (!row.ad_account_id) problems.push('缺少广告户ID')
      if (!row.ad_account_name) problems.push('缺少广告户名字')
      if (!row.client_name) {
        problems.push('缺少客户')
      } else if (!clientNames.includes(row.client_name)) {
        problems.push(`客户「${row.client_name}」还未添加`)
      }
      if (!row.port) problems.push('缺少端口')
      else if (!PORTS.includes(row.port)) problems.push('端口不合法')
      if (!row.opened_on) problems.push('缺少开户日期')
      if (!STATUSES.includes(row.whitelist_status)) problems.push('开白状态不合法')
      if (problems.length) row.error = problems.join('；')
      return row
    })

    const ids = parsed.map((r) => r.ad_account_id).filter(Boolean)
    if (ids.length > 0) {
      const { data } = await supabase
        .from('ad_accounts')
        .select('ad_account_id')
        .in('ad_account_id', ids)
      const existSet = new Set((data || []).map((r) => r.ad_account_id))
      parsed.forEach((r) => {
        if (existSet.has(r.ad_account_id)) {
          r.exists = true
          r.error = r.error ? `${r.error}；ID已存在` : 'ID已存在，将跳过'
        }
      })
    }

    setDrafts(parsed)
  }

  const validNewRows = useMemo(
    () => drafts.filter((r) => !r.error && !r.exists),
    [drafts]
  )

  const handleImport = async () => {
    if (validNewRows.length === 0) return
    setImporting(true)
    setError('')
    setMessage('')

    const payload = validNewRows.map((r) => ({
      ad_account_id: r.ad_account_id,
      ad_account_name: r.ad_account_name,
      client_name: r.client_name || null,
      agency_name: r.agency_name || null,
      port: r.port,
      opened_on: r.opened_on,
      whitelist_submitted: r.whitelist_submitted,
      whitelist_submitted_on: r.whitelist_submitted_on,
      whitelist_status: r.whitelist_status || '待提交',
    }))

    const { data, error } = await supabase.from('ad_accounts').insert(payload).select('id')
    setImporting(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(`成功导入 ${data?.length || validNewRows.length} 条`)
    setDrafts([])
    setRawRows([])
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
            <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem' }}>导入广告户</h1>
            <p style={{ margin: 0, opacity: 0.75 }}>按表头自动匹配，多余列忽略，缺的列可补全</p>
          </div>
          <a href="/tools/ad-accounts" style={ghostBtn}>
            返回查询
          </a>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.6, flex: 1 }}>
            必须包含「广告户ID」「广告户名字」。其他列没有也可以，可在下面补全。
          </p>
          <label htmlFor="csv-file" title="选择 CSV 文件" style={plusBtn}>
            +
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
            style={{ display: 'none' }}
          />
        </div>

        {fileError && <p style={{ color: '#ffb4a8' }}>{fileError}</p>}
        {message && <p style={{ color: '#b8f5c5' }}>{message}</p>}
        {error && <p style={{ color: '#ffb4a8' }}>{error}</p>}

        {rawRows.length > 0 && (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              marginBottom: '16px',
            }}
          >
            {ignoredHeaders.length > 0 && (
              <p style={{ opacity: 0.8 }}>
                已忽略列：{ignoredHeaders.join('、')}
              </p>
            )}
            {missingHeaders.length > 0 ? (
              <p style={{ opacity: 0.8 }}>
                文件缺少这些列，可在此统一补全：{missingHeaders.join('、')}
              </p>
            ) : (
              <p style={{ opacity: 0.8 }}>已知列都已匹配到。</p>
            )}

            {missingHeaders.includes('客户') && (
              <Field label="补全客户（必须是已登记客户）">
                <select value={fillClient} onChange={(e) => setFillClient(e.target.value)} style={inputStyle}>
                  <option value="">请选择</option>
                  {clientNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {missingHeaders.includes('代理') && (
              <Field label="补全代理">
                <input value={fillAgency} onChange={(e) => setFillAgency(e.target.value)} style={inputStyle} />
              </Field>
            )}
            {missingHeaders.includes('端口') && (
              <Field label="补全端口">
                <select value={fillPort} onChange={(e) => setFillPort(e.target.value)} style={inputStyle}>
                  <option value="">请选择</option>
                  {PORTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {missingHeaders.includes('开户日期') && (
              <Field label="补全开户日期">
                <input
                  type="date"
                  value={fillOpenedOn}
                  onChange={(e) => setFillOpenedOn(e.target.value)}
                  style={inputStyle}
                />
              </Field>
            )}
            {missingHeaders.includes('开白状态') && (
              <Field label="补全开白状态">
                <select value={fillStatus} onChange={(e) => setFillStatus(e.target.value)} style={inputStyle}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {missingHeaders.includes('开白提交日期') && (
              <Field label="补全开白提交日期（可空）">
                <input
                  type="date"
                  value={fillSubmittedOn}
                  onChange={(e) => setFillSubmittedOn(e.target.value)}
                  style={inputStyle}
                />
              </Field>
            )}

            <button type="button" onClick={buildDrafts} style={primaryBtn}>
              生成预览
            </button>
          </div>
        )}

        {drafts.length > 0 && (
          <>
            <p style={{ opacity: 0.85 }}>
              共 {drafts.length} 行，可导入 {validNewRows.length} 行
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={validNewRows.length === 0 || importing}
              style={{
                ...primaryBtn,
                opacity: validNewRows.length === 0 || importing ? 0.6 : 1,
                cursor: validNewRows.length === 0 || importing ? 'not-allowed' : 'pointer',
              }}
            >
              {importing ? '导入中…' : `确认导入（${validNewRows.length}）`}
            </button>

            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    {['结果', '广告户ID', '广告户名字', '客户', '代理', '端口', '开户日期', '开白状态'].map(
                      (h) => (
                        <th key={h} style={th}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((row, i) => (
                    <tr key={`${row.ad_account_id}-${i}`}>
                      <td style={td}>
                        {row.error ? (
                          <span style={{ color: '#ffb4a8' }}>{row.error}</span>
                        ) : (
                          <span style={{ color: '#b8f5c5' }}>可导入</span>
                        )}
                      </td>
                      <td style={td}>{row.ad_account_id}</td>
                      <td style={td}>{row.ad_account_name}</td>
                      <td style={td}>{row.client_name || '-'}</td>
                      <td style={td}>{row.agency_name || '-'}</td>
                      <td style={td}>{row.port || '-'}</td>
                      <td style={td}>{row.opened_on || '-'}</td>
                      <td style={td}>{row.whitelist_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ marginBottom: '6px', opacity: 0.85 }}>{label}</div>
      {children}
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

const plusBtn: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'rgba(0,0,0,0.25)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.6rem',
  lineHeight: 1,
  cursor: 'pointer',
  flexShrink: 0,
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: 'none',
  background: '#e85d4c',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(0,0,0,0.25)',
  color: '#fff',
  outline: 'none',
  minWidth: '220px',
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.2)',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
}