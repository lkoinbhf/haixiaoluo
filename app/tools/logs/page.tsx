import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  const { data: logs, error } = await supabase
    .from('work_logs')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.7,
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '48px 24px 60px',
        }}
      >
        <header 
          style={{ 
            marginBottom: '36px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
         }}
        >
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                margin: '0 0 8px',
              }}
            >
              工作日志
            </h1>
            <p style={{ margin: 0, opacity: 0.75 }}>
              公开记录的项目进展
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
        </header>

        {error && (
          <div
            style={{
              color: '#ffb4a8',
              marginBottom: '24px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(255,100,80,0.12)',
              border: '1px solid rgba(255,180,168,0.25)',
            }}
          >
            加载失败：{error.message}
          </div>
        )}

        {!logs || logs.length === 0 ? (
          <p style={{ opacity: 0.7 }}>目前还没有公开的工作日志。</p>
        ) : (
          <div>
            {logs.map((log) => (
              <article
                key={log.id}
                style={{
                  marginBottom: '20px',
                  padding: '20px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    margin: '0 0 8px',
                  }}
                >
                  {log.title}
                </h2>
                <time style={{ fontSize: '0.9rem', opacity: 0.65 }}>
                  {new Date(log.created_at).toLocaleString('zh-CN')}
                </time>
                {log.content && (
                  <div
                    style={{
                      marginTop: '14px',
                      whiteSpace: 'pre-wrap',
                      opacity: 0.9,
                    }}
                  >
                    {log.content}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}