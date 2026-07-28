export default function HomePage() {
  return (
    <main style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '60px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: 1.6
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
        海小螺
      </h1>
      
      <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '40px' }}>
        一个正在进行中的项目
      </p>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>关于项目</h2>
        <p>
          这里之后会放「海小螺」的详细介绍。目前网站刚刚搭建完成，内容和功能会逐步完善。
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>工作日志</h2>
        <p>
          我会在这里记录项目相关的工作进展。
        </p>
        <p style={{ marginTop: '12px' }}>
          <a href="/logs" style={{ color: '#0070f3' }}>查看工作日志 →</a>
        </p>
      </section>

      <footer style={{ marginTop: '80px', color: '#999', fontSize: '0.9rem' }}>
        © {new Date().getFullYear()} 海小螺
      </footer>
    </main>
  )
}