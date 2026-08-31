'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function PayerList({ payers }: { payers: string[] }) {
    const [open, setOpen] = useState(false)
    if (payers.length === 0) return <span>-</span>
  
    const shown = open || payers.length <= 3 ? payers : payers.slice(0, 3)
  
    return (
      <div>
        {shown.map((name) => (
          <div key={name}>{name}</div>
        ))}
        {payers.length > 3 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              marginTop: '4px',
              padding: 0,
              border: 'none',
              background: 'none',
              color: '#e85d4c',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {open ? '收起' : `展开全部（${payers.length}）`}
          </button>
        )}
      </div>
    )
}

type ClientRow = {
  id: number
  name: string
  delivery_type: string
  payers: string[]
  accountCount: number
}

type AgencyRow = {
  id: number
  name: string
  payees: string[]
  accountCount: number
}

export default function ClientsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<ClientRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'clients' | 'agencies'>('clients')
    const [agencyRows, setAgencyRows] = useState<AgencyRow[]>([])

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

      const [
        { data: clients, error: cErr },
        { data: payers, error: pErr },
        { data: accounts, error: aErr },
        { data: agencies, error: agErr },
        { data: payees, error: peErr },
      ] = await Promise.all([
        supabase.from('clients').select('id, name, delivery_type').order('id', { ascending: true }),
        supabase.from('client_payers').select('client_id, payer_name'),
        supabase.from('ad_accounts').select('client_name, agency_name'),
        supabase.from('agencies').select('id, name').order('id', { ascending: true }),
        supabase.from('agency_payees').select('agency_id, payee_name'),
      ])

      if (cErr || pErr || aErr || agErr || peErr) {
        setError(cErr?.message || pErr?.message || aErr?.message || agErr?.message || peErr?.message || '读取失败')
        setRows([])
        setAgencyRows([])
        setLoading(false)
        return
      }

      const payerMap: Record<number, string[]> = {}
      ;(payers || []).forEach((p: { client_id: number; payer_name: string }) => {
        if (!payerMap[p.client_id]) payerMap[p.client_id] = []
        payerMap[p.client_id].push(p.payer_name)
      })

      const countMap: Record<string, number> = {}
      ;(accounts || []).forEach((a: { client_name: string | null }) => {
        if (!a.client_name) return
        countMap[a.client_name] = (countMap[a.client_name] || 0) + 1
      })

      setRows(
        (clients || []).map((c: { id: number; name: string; delivery_type: string }) => ({
          id: c.id,
          name: c.name,
          delivery_type: c.delivery_type,
          payers: payerMap[c.id] || [],
          accountCount: countMap[c.name] || 0,
        }))
      )

      const payeeMap: Record<number, string[]> = {}
      ;(payees || []).forEach((p: { agency_id: number; payee_name: string }) => {
        if (!payeeMap[p.agency_id]) payeeMap[p.agency_id] = []
        payeeMap[p.agency_id].push(p.payee_name)
      })

      const agencyCountMap: Record<string, number> = {}
      ;(accounts || []).forEach((a: { agency_name: string | null }) => {
        if (!a.agency_name) return
        agencyCountMap[a.agency_name] = (agencyCountMap[a.agency_name] || 0) + 1
      })

      setAgencyRows(
        (agencies || []).map((a: { id: number; name: string }) => ({
          id: a.id,
          name: a.name,
          payees: payeeMap[a.id] || [],
          accountCount: agencyCountMap[a.name] || 0,
        }))
      )
      setLoading(false)
    }
    load()
  }, [ready])

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
            marginBottom: '16px',
          }}
        >
          <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem' }}>
              {tab === 'clients' ? '客户' : '代理'}
            </h1>
            <p style={{ margin: 0, opacity: 0.75 }}>
              {tab === 'clients'
                ? '查看客户、投放类型、支付主体和对应广告户数量'
                : '查看代理、收款主体和对应广告户数量'}
            </p>
          </div>
          <a href="/account/manage" style={ghostBtn}>
            返回控制台
          </a>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          
          <button
            type="button"
            onClick={() => setTab('clients')}
            style={{
              ...ghostBtn,
              background: tab === 'clients' ? 'rgba(232,93,76,0.25)' : 'transparent',
              borderColor: tab === 'clients' ? 'rgba(232,93,76,0.5)' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}
          >
            客户
          </button>

          <button
            type="button"
            onClick={() => setTab('agencies')}
            style={{
              ...ghostBtn,
              background: tab === 'agencies' ? 'rgba(232,93,76,0.25)' : 'transparent',
              borderColor: tab === 'agencies' ? 'rgba(232,93,76,0.5)' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}
          >
            代理
          </button>

        </div>

        {error && <p style={{ color: '#ffb4a8' }}>加载失败：{error}</p>}
        {loading && <p style={{ opacity: 0.75 }}>读取中…</p>}
        {tab === 'clients' && !loading && rows.length === 0 && (
          <p style={{ opacity: 0.75 }}>还没有客户记录。</p>
        )}

        {tab === 'clients' && !loading && rows.length > 0 && (
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
                  {['ID', '名字', '投放类型', '支付主体', '广告户数量'].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.id}</td>
                    <td style={td}>{row.name}</td>
                    <td style={td}>{row.delivery_type}</td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      <PayerList payers={row.payers} />
                    </td>
                    <td style={td}>
                      <a
                        href={`/tools/ad-accounts?client=${encodeURIComponent(row.name)}`}
                        style={{ color: '#e85d4c', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {row.accountCount}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


        {tab === 'agencies' && !loading && agencyRows.length === 0 && (
          <p style={{ opacity: 0.75 }}>还没有代理记录。</p>
        )}
        {tab === 'agencies' && !loading && agencyRows.length > 0 && (
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
                  {['ID', '名字', '收款主体', '广告户数量'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agencyRows.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.id}</td>
                    <td style={td}>{row.name}</td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      <PayerList payers={row.payees} />
                    </td>
                    <td style={td}>{row.accountCount}</td>
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

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.2)',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: '#16213e',
  zIndex: 1,
}

const td: React.CSSProperties = {
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
}