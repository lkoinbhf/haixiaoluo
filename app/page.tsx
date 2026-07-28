export default function HomePage() {
  return (
    <main style={{ 
      maxWidth: '720px', 
      margin: '0 auto', 
      padding: '80px 24px 60px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: 1.7,
      color: '#222'
    }}>
      <header style={{ marginBottom: '64px' }}>
        <h1 style={{ 
          fontSize: '2.75rem', 
          fontWeight: 700, 
          marginBottom: '12px',
          letterSpacing: '-0.02em'
        }}>
          海小螺
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#666' }}>
          一个正在进行中的项目
        </p>
      </header>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ 
          fontSize: '1.35rem', 
          fontWeight: 600, 
          marginBottom: '12px' 
        }}>
          关于项目
        </h2>
        <p style={{ color: '#444' }}>
          这里之后会放「海小螺」的详细介绍。目前网站刚刚搭建完成，内容和功能会逐步完善。
        </p>
      </section>

      <section style={{ marginBottom: '64px' }}>
        <h2 style={{ 
          fontSize: '1.35rem', 
          fontWeight: 600, 
          marginBottom: '12px' 
        }}>
          工作日志
        </h2>
        <p style={{ color: '#444', marginBottom: '16px' }}>
          我会在这里记录项目相关的工作进展。
        </p>
        <a 
          href="/logs" 
          style={{ 
            color: '#0066cc', 
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          查看工作日志 →
        </a>
      </section>

      <footer style={{ 
        borderTop: '1px solid #eee', 
        paddingTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.9rem',
        color: '#999'
      }}>
        <span>© {new Date().getFullYear()} 海小螺</span>
        <a 
          href="/admin" 
          style={{ 
            color: '#aaa', 
            textDecoration: 'none',
            fontSize: '0.85rem'
          }}
        >
          管理
        </a>
      </footer>
    </main>
  )
}