'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fileToTable } from '@/lib/readTable'
import { supabase } from '@/lib/supabase'
import DarkSelect from '@/app/components/DarkSelect'

type DraftRow = {
  transaction_id: string
  occurred_at: string
  description: string
  amount: number | null
  debit_net: number | null
  credit_net: number | null
  direction: 'in' | 'out' | ''
  counterparty_name: string
  client_id: number | null
  client_name: string
  agency_id: number | null
  agency_name: string
  error?: string
  exists?: boolean
}

type FundRow = {
  id: number
  transaction_id: string
  occurred_at: string
  description: string | null
  amount: number | null
  debit_net: number | null
  credit_net: number | null
  direction: string
  counterparty_name: string | null
  client_id: number | null
  client_name: string
  agency_id: number | null
  agency_name: string
}

function stripTz(value: string) {
    return value
      .replace(/([+-]\d{2}:?\d{2}|Z)$/i, '')
      .replace('T', ' ')
      .trim()
}

function parseMoney(value: string): number | null {
  const s = value.replace(/,/g, '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function extractCounterparty(description: string, direction: 'in' | 'out' | '') {
  if (direction === 'in') {
    const m = description.match(/received from (.+?)'s Airwallex wallet/i)
    return m?.[1]?.trim() || ''
  }
  if (direction === 'out') {
    return description.split(',')[0]?.trim() || ''
  }
  return ''
}

export default function FundsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  const [rows, setRows] = useState<FundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<{ id: number; name: string }[]>([])

  const [direction, setDirection] = useState('')
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState('')
  const [applied, setApplied] = useState({ direction: '', clientId: '', month: '' })

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

  const loadRows = async () => {
    setLoading(true)
    setError('')
    const [{ data: funds, error: fErr }, { data: clientData }, { data: agencyData }] = await Promise.all([
      supabase
        .from('fund_transactions')
        .select(
          'id, transaction_id, occurred_at, description, amount, debit_net, credit_net, direction, counterparty_name, client_id, agency_id'
        )
        .order('occurred_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('agencies').select('id, name').order('name'),
    ])

    if (fErr) setError(fErr.message)
    const nameMap = new Map((clientData || []).map((c: { id: number; name: string }) => [c.id, c.name]))
    setClients((clientData || []) as { id: number; name: string }[])
    setRows(
      ((funds || []) as Omit<FundRow, 'client_name'>[]).map((r) => ({
        ...r,
        client_name: r.client_id ? nameMap.get(r.client_id) || '' : '',
      }))
    )

    const agencyMap = new Map((agencyData || []).map((a: { id: number; name: string }) => [a.id, a.name]))
    setRows(
      ((funds || []) as Omit<FundRow, 'client_name' | 'agency_name'>[]).map((r) => ({
        ...r,
        client_name: r.client_id ? nameMap.get(r.client_id) || '' : '',
        agency_name: r.agency_id ? agencyMap.get(r.agency_id) || '' : '',
      }))
    )

    setLoading(false)
  }

  useEffect(() => {
    if (!ready) return
    loadRows()
  }, [ready])

  const handleFile = async (file: File) => {
    setMessage('')
    setError('')
    setDrafts([])

    const table = await fileToTable(file)
    if (table.length < 2) {
      setError('CSV 内容为空，或缺少表头')
      return
    }

    const header = table[0].map((h) => h.replace(/\s/g, ''))
    const idx = (name: string) => header.findIndex((h) => h === name.replace(/\s/g, ''))
    const iTime = idx('Time')
    const iDesc = idx('Description')
    const iTid = idx('TransactionId')
    const iAmount = idx('Amount')
    const iDebit = idx('DebitNetAmount')
    const iCredit = idx('CreditNetAmount')

    if (iTime < 0 || iDesc < 0 || iTid < 0) {
      setError('表头缺少 Time / Description / Transaction Id')
      return
    }

    const [{ data: payers }, { data: clientData }, { data: existing }, { data: payees }, { data: agencyData }] =
      await Promise.all([
        supabase.from('client_payers').select('client_id, payer_name'),
        supabase.from('clients').select('id, name'),
        supabase.from('fund_transactions').select('transaction_id'),
        supabase.from('agency_payees').select('agency_id, payee_name'),
        supabase.from('agencies').select('id, name'),
      ])

    const clientNameById = new Map((clientData || []).map((c: { id: number; name: string }) => [c.id, c.name]))
    const agencyNameById = new Map((agencyData || []).map((a: { id: number; name: string }) => [a.id, a.name]))
    const existSet = new Set((existing || []).map((r: { transaction_id: string }) => r.transaction_id))

    const parsed: DraftRow[] = table.slice(1).map((cols) => {
      const description = cols[iDesc] || ''
      const debit_net = iDebit >= 0 ? parseMoney(cols[iDebit] || '') : null
      const credit_net = iCredit >= 0 ? parseMoney(cols[iCredit] || '') : null
      const dir: DraftRow['direction'] =
        credit_net && credit_net > 0 ? 'in' : debit_net && debit_net > 0 ? 'out' : ''
      const counterparty_name = extractCounterparty(description, dir)
      const transaction_id = cols[iTid] || ''

      const row: DraftRow = {
        transaction_id,
        occurred_at: stripTz(cols[iTime] || ''),
        description,
        amount: iAmount >= 0 ? parseMoney(cols[iAmount] || '') : null,
        debit_net,
        credit_net,
        direction: dir,
        counterparty_name,
        client_id: null,
        client_name: '',
        agency_id: null,
        agency_name: '',
      }

      const problems: string[] = []
      if (!transaction_id) problems.push('缺少 Transaction Id')
      if (!row.occurred_at) problems.push('缺少 Time')
      if (!dir) problems.push('无法判断收入或支出')

      if (dir === 'in') {
        if (!counterparty_name) {
          problems.push('描述里没有打款主体')
        } else {
          const hits = (payers || []).filter(
            (p: { payer_name: string }) => p.payer_name === counterparty_name
          )
          if (hits.length === 0) {
            problems.push(`打款主体「${counterparty_name}」未登记，客户未添加`)
          } else if (hits.length > 1) {
            problems.push(`打款主体「${counterparty_name}」对应多个客户`)
          } else {
            row.client_id = hits[0].client_id
            row.client_name = clientNameById.get(hits[0].client_id) || ''
          }
        }
      }

      if (dir === 'out') {
        if (!counterparty_name) {
          problems.push('描述里没有收款主体')
        } else {
          const hits = (payees || []).filter(
            (p: { payee_name: string }) => p.payee_name === counterparty_name
          )
          if (hits.length === 0) {
            problems.push(`收款主体「${counterparty_name}」未登记，代理未添加`)
          } else if (hits.length > 1) {
            problems.push(`收款主体「${counterparty_name}」对应多个代理`)
          } else {
            row.agency_id = hits[0].agency_id
            row.agency_name = agencyNameById.get(hits[0].agency_id) || ''
          }
        }
      }

      if (!transaction_id) {
        // 已有「缺少 Transaction Id」
      } else if (existSet.has(transaction_id)) {
        row.exists = true
        problems.push('记录已存在，将跳过')
      } else {
        existSet.add(transaction_id)
      }
      if (problems.length) row.error = problems.join('；')
      return row
    })

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
      transaction_id: r.transaction_id,
      occurred_at: r.occurred_at,
      description: r.description,
      amount: r.amount,
      debit_net: r.debit_net,
      credit_net: r.credit_net,
      direction: r.direction,
      counterparty_name: r.counterparty_name || null,
      client_id: r.client_id,
      agency_id: r.agency_id,
    }))

    const { data, error } = await supabase.from('fund_transactions').insert(payload).select('id')
    setImporting(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage(`成功导入 ${data?.length || validNewRows.length} 条`)
    setDrafts([])
    await loadRows()
  }

  const monthOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      const m = r.occurred_at.slice(0, 7)
      if (m) set.add(m)
    })
    return Array.from(set).sort().reverse()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (applied.month && row.occurred_at.slice(0, 7) !== applied.month) return false
      if (applied.direction && row.direction !== applied.direction) return false
      if (applied.clientId === 'none') return !row.client_id
      if (applied.clientId && String(row.client_id) !== applied.clientId) return false
      return true
    })
  }, [rows, applied])

  const incomeSum = filtered
    .filter((r) => r.direction === 'in')
    .reduce((s, r) => s + (Number(r.credit_net) || 0), 0)
  const outcomeSum = filtered
    .filter((r) => r.direction === 'out')
    .reduce((s, r) => s + (Number(r.debit_net) || 0), 0)

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
            <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem' }}>资金流水</h1>
            <p style={{ margin: 0, opacity: 0.75 }}>查询已导入记录，或上传新的报表</p>
          </div>
          <a href="/account/manage" style={ghostBtn}>
            返回控制台
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
          }}
        >
          <p style={{ margin: 0, opacity: 0.85, flex: 1, lineHeight: 1.6 }}>
            点 + 上传 CSV。收入必须匹配已登记支付主体，重复记录会跳过。
          </p>
          <label htmlFor="fund-csv" title="选择 CSV 文件" style={plusBtn}>
            +
          </label>
          <input
            id="fund-csv"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
            style={{ display: 'none' }}
          />
        </div>

        {message && <p style={{ color: '#b8f5c5' }}>{message}</p>}
        {error && <p style={{ color: '#ffb4a8' }}>{error}</p>}

        {drafts.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ opacity: 0.85 }}>
              预览 {drafts.length} 行，可导入 {validNewRows.length} 行
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={validNewRows.length === 0 || importing}
              style={{
                ...primaryBtn,
                opacity: validNewRows.length === 0 || importing ? 0.6 : 1,
                cursor: validNewRows.length === 0 || importing ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
              }}
            >
              {importing ? '导入中…' : `确认导入（${validNewRows.length}）`}
            </button>
            <div style={{ overflow: 'auto', maxHeight: '240px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    {['结果', '时间', '方向', '对方', '客户', '净额'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((row, i) => (
                    <tr key={`${row.transaction_id}-${i}`}>
                      <td style={td}>
                        {row.error ? (
                          <span style={{ color: '#ffb4a8' }}>{row.error}</span>
                        ) : (
                          <span style={{ color: '#b8f5c5' }}>可导入</span>
                        )}
                      </td>
                      <td style={td}>{row.occurred_at.replace('T', ' ').slice(0, 19)}</td>
                      <td style={td}>{row.direction === 'in' ? '收入' : row.direction === 'out' ? '支出' : '-'}</td>
                      <td style={td}>{row.client_name || row.agency_name || '-'}</td>
                      <td style={td}>{row.client_name || '-'}</td>
                      <td style={td}>{row.direction === 'in' ? row.credit_net : row.debit_net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
        <DarkSelect
            label="方向"
            value={direction === 'in' ? '收入' : direction === 'out' ? '支出' : ''}
            onChange={(v) => setDirection(v === '收入' ? 'in' : v === '支出' ? 'out' : '')}
            options={['收入', '支出']}
          />
          <DarkSelect
            label="客户"
            value={
              clientId === 'none'
                ? '未匹配客户'
                : clients.find((c) => String(c.id) === clientId)?.name || ''
            }
            onChange={(v) => {
              if (v === '未匹配客户') setClientId('none')
              else if (!v) setClientId('')
              else {
                const found = clients.find((c) => c.name === v)
                setClientId(found ? String(found.id) : '')
              }
            }}
            options={['未匹配客户', ...clients.map((c) => c.name)]}
          />
          <DarkSelect
            label="月份"
            value={month}
            onChange={setMonth}
            options={monthOptions}
          />
          <button
            type="button"
            onClick={() => setApplied({ direction, clientId, month })}
            style={primaryBtn}
          >
            查询
          </button>
        </div>

        <p style={{ opacity: 0.8 }}>
          当前结果 {filtered.length} 条，收入合计 {incomeSum}，支出合计 {outcomeSum}
        </p>

        {loading && <p style={{ opacity: 0.75 }}>读取中…</p>}
        {!loading && filtered.length === 0 && <p style={{ opacity: 0.75 }}>没有符合条件的记录。</p>}

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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  {['时间', '方向', '对方', '客户/代理', '净额', '含手续费金额', 'Transaction Id'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.occurred_at.replace('T', ' ').slice(0, 19)}</td>
                    <td style={td}>{row.direction === 'in' ? '收入' : '支出'}</td>
                    <td style={td}>{row.counterparty_name || '-'}</td>
                    <td style={td}>{row.client_name || row.agency_name || '-'}</td>
                    <td style={td}>{row.direction === 'in' ? row.credit_net : row.debit_net}</td>
                    <td style={td}>{row.amount ?? '-'}</td>
                    <td style={td}>{row.transaction_id}</td>
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
  minWidth: '160px',
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.2)',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: '#16213e',
}

const td: React.CSSProperties = {
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
}