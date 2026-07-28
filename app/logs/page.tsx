import { supabase } from '@/lib/supabase'

export default async function LogsPage() {
  const { data: logs, error } = await supabase
    .from('work_logs')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <main style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '60px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: 1.6
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>工作日志</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        <a href="/" style={{ color: '#0070f3' }}>← 返回首页</a>
      </p>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
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
                marginBottom: '32px', 
                paddingBottom: '32px', 
                borderBottom: '1px solid #eee' 
              }}
            >
              <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
                {log.title}
              </h2>
              <time style={{ fontSize: '0.9rem', color: '#888' }}>
                {new Date(log.created_at).toLocaleString('zh-CN')}
              </time>
              {log.content && (
                <div style={{ marginTop: '12px', whiteSpace: 'pre-wrap' }}>
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