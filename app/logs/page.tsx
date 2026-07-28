import { supabase } from '@/lib/supabase'

export default async function LogsPage() {
  const { data: logs, error } = await supabase
    .from('work_logs')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <main style={{ 
      maxWidth: '720px', 
      margin: '0 auto', 
      padding: '80px 24px 60px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: 1.7,
      color: '#222'
    }}>
      <header style={{ marginBottom: '48px' }}>
        <a 
          href="/" 
          style={{ 
            color: '#0066cc', 
            textDecoration: 'none',
            fontSize: '0.95rem'
          }}
        >
          ← 返回首页
        </a>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 700, 
          marginTop: '20px',
          marginBottom: '8px'
        }}>
          工作日志
        </h1>
      </header>

      {error && (
        <div style={{ color: '#c00', marginBottom: '24px' }}>
          加载失败：{error.message}
        </div>
      )}

      {!logs || logs.length === 0 ? (
        <p style={{ color: '#888' }}>目前还没有公开的工作日志。</p>
      ) : (
        <div>
          {logs.map((log) => (
            <article 
              key={log.id} 
              style={{ 
                marginBottom: '40px', 
                paddingBottom: '40px', 
                borderBottom: '1px solid #eee' 
              }}
            >
              <h2 style={{ 
                fontSize: '1.35rem', 
                fontWeight: 600, 
                marginBottom: '8px' 
              }}>
                {log.title}
              </h2>
              <time style={{ fontSize: '0.9rem', color: '#888' }}>
                {new Date(log.created_at).toLocaleString('zh-CN')}
              </time>
              {log.content && (
                <div style={{ 
                  marginTop: '16px', 
                  whiteSpace: 'pre-wrap',
                  color: '#444'
                }}>
                  {log.content}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}